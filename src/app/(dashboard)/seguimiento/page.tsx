"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";
import { ViewTopbar } from "@/components/view-topbar";
import { useCurrentUser } from "@/components/current-user-provider";

type Prospect = {
  id: string;
  full_name: string;
  state: "prospecto" | "interesado" | "en_seguimiento" | "congelado";
  last_interaction_at: string;
  frozen_at: string | null;
};

type Attempt = { prospect_id: string; type: string; occurred_at: string };

type Settings = { alert_days: number; freeze_days: number; max_attempts_week: number };

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
}

/** Lunes 00:00 de la semana actual (los intentos RD-03 se cuentan por semana) */
function weekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - day);
  return d;
}

export default function SeguimientoPage() {
  const { currentUser } = useCurrentUser();
  const readOnly = currentUser?.role === "administrador";

  const [settings, setSettings] = useState<Settings>({ alert_days: 3, freeze_days: 5, max_attempts_week: 2 });
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"todas" | "vencer" | "congelados">("todas");
  const [reactivating, setReactivating] = useState<Prospect | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: settingsRows } = await supabase.from("app_settings").select("key, value");
      const s = { ...settings };
      for (const row of settingsRows ?? []) {
        if (row.key in s) s[row.key as keyof Settings] = Number(row.value);
      }
      setSettings(s);

      const { data: prospectRows } = await supabase
        .from("prospects")
        .select("id, full_name, state, last_interaction_at, frozen_at")
        .order("last_interaction_at", { ascending: true });

      let rows = (prospectRows ?? []) as Prospect[];

      // RD-02: paso automático a Congeladora tras N días sin respuesta
      const toFreeze = rows.filter(
        (p) => p.state !== "congelado" && daysSince(p.last_interaction_at) >= s.freeze_days,
      );
      for (const p of toFreeze) {
        await supabase
          .from("prospects")
          .update({ state: "congelado", frozen_at: new Date().toISOString() })
          .eq("id", p.id);
        await supabase.from("interactions").insert({
          type: "sistema",
          result: "Movido a Congeladora",
          notes: `${s.freeze_days} días sin respuesta (RD-02). Recontactar en 2 semanas.`,
          prospect_id: p.id,
        });
        await logAudit(
          "Prospecto movido a Congeladora",
          `${p.full_name} · ${s.freeze_days} días sin respuesta (RD-02).`,
          "sistema (automático)",
        );
      }
      if (toFreeze.length > 0) {
        // El insert de interacciones actualiza last_interaction_at por trigger;
        // se restaura para conservar la antigüedad real del silencio
        for (const p of toFreeze) {
          await supabase
            .from("prospects")
            .update({ last_interaction_at: p.last_interaction_at })
            .eq("id", p.id);
        }
        rows = rows.map((p) =>
          toFreeze.some((f) => f.id === p.id)
            ? { ...p, state: "congelado" as const, frozen_at: new Date().toISOString() }
            : p,
        );
      }
      setProspects(rows);

      // Intentos de contacto de la semana (RD-03)
      const { data: attemptRows } = await supabase
        .from("interactions")
        .select("prospect_id, type, occurred_at")
        .in("type", ["llamada", "whatsapp"])
        .gte("occurred_at", weekStart().toISOString())
        .not("prospect_id", "is", null);
      setAttempts((attemptRows ?? []) as Attempt[]);

      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const attemptsFor = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of attempts) map[a.prospect_id] = (map[a.prospect_id] ?? 0) + 1;
    return map;
  }, [attempts]);

  type AlertItem = { kind: "warn" | "cold" | "limit"; prospect: Prospect; text: string; sub: string };

  const alerts: AlertItem[] = useMemo(() => {
    const list: AlertItem[] = [];
    for (const p of prospects) {
      const days = daysSince(p.last_interaction_at);
      const used = attemptsFor[p.id] ?? 0;
      if (p.state === "congelado") {
        list.push({
          kind: "cold",
          prospect: p,
          text: `${p.full_name} — en Congeladora`,
          sub: `${days} días sin respuesta · Recontactar en 2 semanas (RD-02)`,
        });
      } else if (days >= settings.alert_days) {
        list.push({
          kind: "warn",
          prospect: p,
          text: `${p.full_name} — ${days} días sin respuesta`,
          sub: `Última interacción: ${new Date(p.last_interaction_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })} (RD-04)`,
        });
      } else if (used >= settings.max_attempts_week) {
        list.push({
          kind: "limit",
          prospect: p,
          text: `${p.full_name} — límite de contacto alcanzado`,
          sub: `${used} intentos esta semana · Próximo intento habilitado: lunes (RD-03)`,
        });
      }
    }
    return list;
  }, [prospects, attemptsFor, settings]);

  const shownAlerts = alerts.filter((a) => {
    if (filter === "todas") return true;
    if (filter === "vencer") return a.kind === "warn";
    return a.kind === "cold";
  });

  const usedForReactivating = reactivating ? (attemptsFor[reactivating.id] ?? 0) : 0;
  const limitReached = usedForReactivating >= settings.max_attempts_week;

  async function handleReactivate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reactivating || limitReached) return;
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const channel = form.get("channel") as string; // 'llamada' | 'whatsapp'
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("interactions").insert({
      type: channel,
      result: "Intento de contacto",
      notes: ((form.get("notes") as string) || "").trim() || null,
      prospect_id: reactivating.id,
      user_id: user?.id ?? null,
    });

    if (reactivating.state === "congelado") {
      await supabase
        .from("prospects")
        .update({ state: "en_seguimiento", frozen_at: null })
        .eq("id", reactivating.id);
    }

    setSaving(false);
    setReactivating(null);
    setToast("Intento de contacto registrado. La alerta se reinicia.");
    setTimeout(() => setToast(null), 3000);
    setVersion((v) => v + 1);
  }

  const alertIcon = { warn: "⏰", cold: "🧊", limit: "🚫" };
  const alertIconCls = {
    warn: "bg-[#8a6b2e]/10 text-[#8a6b2e]",
    cold: "bg-[#5d7a9a]/15 text-[#5d7a9a]",
    limit: "bg-[#ba1a1a]/10 text-[#ba1a1a]",
  };

  const pill = (active: boolean) =>
    `cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
      active ? "border-[#0b1c30] bg-[#0b1c30] text-white" : "border-[#c4c5d5] bg-white text-[#444653] hover:bg-[#eff4ff]"
    }`;

  const inputClass =
    "h-10 w-full rounded-lg border border-[#c4c5d5] bg-white px-4 text-sm outline-none transition-all focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20";

  return (
    <>
      <ViewTopbar breadcrumb="Continuidad · CU-08" title="Seguimiento Comercial" />
      <div className="p-8">
        {/* Reglas parametrizadas */}
        <div className="mb-6 grid grid-cols-1 overflow-hidden rounded-xl border border-[#c4c5d5] bg-white md:grid-cols-3 md:divide-x md:divide-[#c4c5d5]">
          {[
            { id: "RD-04", val: `${settings.alert_days} días`, desc: "Sin respuesta → genera alerta al vendedor" },
            { id: "RD-02", val: `${settings.freeze_days} días`, desc: "Sin respuesta → pasa automáticamente a Congeladora" },
            { id: "RD-03", val: `${settings.max_attempts_week} / semana`, desc: "Máximo de intentos de contacto por canal" },
          ].map((r) => (
            <div key={r.id} className="px-5 py-4">
              <p className="font-mono text-[10px] font-bold tracking-wider text-[#00288e]">{r.id}</p>
              <p className="mt-1 text-xl font-bold text-[#0b1c30]">{r.val}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-[#757684]">{r.desc}</p>
            </div>
          ))}
        </div>

        {/* Bandeja de alertas */}
        <div className="mb-6 overflow-hidden rounded-xl border border-[#c4c5d5] bg-white">
          <div className="flex items-center justify-between border-b border-[#c4c5d5] px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-[#0b1c30]">Bandeja de alertas</h2>
              <p className="text-xs text-[#757684]">
                Generadas automáticamente
                {readOnly ? " · vista global (Administrador)" : " · solo tus prospectos (RD-10)"}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setFilter("todas")} className={pill(filter === "todas")}>Todas ({alerts.length})</button>
              <button onClick={() => setFilter("vencer")} className={pill(filter === "vencer")}>Por vencer ({settings.alert_days}d)</button>
              <button onClick={() => setFilter("congelados")} className={pill(filter === "congelados")}>Congelados ({settings.freeze_days}d)</button>
            </div>
          </div>
          <div className="divide-y divide-[#c4c5d5]/50">
            {loading && <p className="p-6 text-sm text-[#757684]">Calculando alertas...</p>}
            {!loading && shownAlerts.length === 0 && (
              <p className="p-6 text-sm text-[#757684]">Sin alertas en esta vista. Cartera al día. ✅</p>
            )}
            {shownAlerts.map((a) => {
              const used = attemptsFor[a.prospect.id] ?? 0;
              return (
                <div key={a.prospect.id + a.kind} className="flex items-center gap-4 px-6 py-4">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] ${alertIconCls[a.kind]}`}>
                    {alertIcon[a.kind]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-[#0b1c30]">{a.text}</p>
                    <p className="text-[11.5px] text-[#757684]">{a.sub}</p>
                  </div>
                  {a.kind === "limit" ? (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: settings.max_attempts_week }).map((_, i) => (
                        <span key={i} className={`h-2 w-2 rounded-full ${i < used ? "bg-[#ba1a1a]" : "bg-[#c4c5d5]"}`} />
                      ))}
                    </div>
                  ) : (
                    !readOnly && (
                      <button
                        onClick={() => setReactivating(a.prospect)}
                        className="shrink-0 rounded px-2.5 py-1 text-xs font-bold text-[#00288e] hover:bg-[#eff4ff]"
                      >
                        Reactivar contacto →
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Reactivar contacto */}
        {reactivating && !readOnly && (
          <div className="overflow-hidden rounded-xl border border-[#c4c5d5] bg-white">
            <div className="flex items-center justify-between border-b border-[#c4c5d5] px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#0b1c30]">Reactivar contacto — {reactivating.full_name}</h2>
                <p className="text-xs text-[#757684]">Valida el límite de intentos antes de habilitar la acción (RD-03)</p>
              </div>
              <button onClick={() => setReactivating(null)} className="material-symbols-outlined text-[#757684] hover:text-[#ba1a1a]">close</button>
            </div>
            <form onSubmit={handleReactivate} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#444653]">Canal de contacto</label>
                <select name="channel" defaultValue="llamada" className={inputClass}>
                  <option value="llamada">Llamada telefónica</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#444653]">Intentos esta semana</label>
                <input
                  type="text"
                  disabled
                  value={`${usedForReactivating} / ${settings.max_attempts_week} — ${limitReached ? "límite alcanzado" : "habilitado"}`}
                  className={`h-10 w-full rounded-lg border px-4 text-sm font-semibold ${
                    limitReached
                      ? "border-[#ba1a1a]/40 bg-[#ba1a1a]/5 text-[#ba1a1a]"
                      : "border-[#006a61]/40 bg-[#006a61]/5 text-[#006a61]"
                  }`}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-[#444653]">Notas del intento (opcional)</label>
                <input type="text" name="notes" placeholder="ej. Se envió recordatorio con nueva propuesta." className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saving || limitReached}
                  className="rounded-lg bg-[#00288e] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#00288e]/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {limitReached
                    ? "Bloqueado por límite semanal (RD-03)"
                    : saving
                      ? "Registrando..."
                      : "Registrar intento de contacto"}
                </button>
              </div>
            </form>
            <div className="px-6 pb-5">
              <p className="rounded-lg border-l-4 border-[#00288e] bg-[#eff4ff] px-4 py-2.5 text-xs leading-relaxed text-[#444653]">
                <b className="text-[#00288e]">RD-03:</b> los umbrales de {settings.alert_days}, {settings.freeze_days} días
                y {settings.max_attempts_week} intentos/semana son parametrizables por el Administrador — no están fijos
                en el código.
              </p>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-8 right-8 z-[100] rounded-lg bg-[#213145] px-6 py-4 text-sm text-white shadow-lg">
          ✓ {toast}
        </div>
      )}
    </>
  );
}
