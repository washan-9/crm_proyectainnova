"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";
import { ViewTopbar } from "@/components/view-topbar";

type Channel = "facebook_ads" | "instagram" | "referido" | "google_ads" | "otro";

type Lead = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  channel: Channel;
  state: "nuevo" | "contactado";
  created_at: string;
};

type Vendedor = { id: string; full_name: string };

const channelLabels: Record<Channel, string> = {
  facebook_ads: "FACEBOOK_ADS",
  instagram: "INSTAGRAM",
  referido: "REFERIDO",
  google_ads: "GOOGLE_ADS",
  otro: "OTRO",
};

const CALL_RESULTS = [
  "Contactado — mostró interés",
  "Contactado — sin interés",
  "No contesta",
  "Buzón de voz",
  "Número inválido",
] as const;

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function waitingTime(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return "<1h";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function CalificacionPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pendientes" | "contactados">("pendientes");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [callResult, setCallResult] = useState<(typeof CALL_RESULTS)[number]>(CALL_RESULTS[0]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("leads")
      .select("id, full_name, email, phone, channel, state, created_at")
      .in("state", ["nuevo", "contactado"])
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setLeads((data ?? []) as Lead[]);
        setLoading(false);
      });

    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "vendedor")
      .eq("status", "activo")
      .order("full_name")
      .then(({ data }) => setVendedores((data ?? []) as Vendedor[]));
  }, [version]);

  const isInterested = callResult === "Contactado — mostró interés";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setMsg(null);

    const form = new FormData(e.currentTarget);
    const notes = ((form.get("notes") as string) || "").trim();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isInterested) {
      // CU-04 · RD-05: conversión solo tras interés explícito.
      // El prospecto nace asignado a un vendedor; el teleoperador
      // pierde acceso al registro desde este momento.
      const vendedorId = form.get("vendedor") as string;
      const prospectId = crypto.randomUUID();

      const { error: prospectError } = await supabase.from("prospects").insert({
        id: prospectId,
        lead_id: selected.id,
        full_name: selected.full_name,
        email: selected.email,
        phone: selected.phone,
        channel: selected.channel,
        state: "prospecto",
        assigned_to: vendedorId,
        budget: form.get("budget") ? Number(form.get("budget")) : null,
        desired_area: ((form.get("desired_area") as string) || "").trim() || null,
        financing: form.get("financing") === "on",
      });

      if (prospectError) {
        setSaving(false);
        setMsg({ text: `No se pudo convertir: ${prospectError.message}`, error: true });
        return;
      }

      await Promise.all([
        supabase
          .from("leads")
          .update({ state: "convertido", converted_prospect_id: prospectId })
          .eq("id", selected.id),
        supabase.from("interactions").insert({
          type: "llamada",
          result: callResult,
          notes: notes || null,
          lead_id: selected.id,
          prospect_id: prospectId,
          user_id: user?.id ?? null,
        }),
        logAudit(
          "Lead convertido a Prospecto",
          `${selected.full_name} asignado a vendedor (CU-04, RD-05).`,
        ),
      ]);

      setSaving(false);
      setSelected(null);
      setMsg({ text: `${selected.full_name} fue convertido a Prospecto y asignado al vendedor. Ya no aparece en tu bandeja (RD-05).`, error: false });
      setVersion((v) => v + 1);
      return;
    }

    // Resultados sin conversión
    const discard = callResult === "Contactado — sin interés" || callResult === "Número inválido";
    await Promise.all([
      supabase.from("interactions").insert({
        type: "llamada",
        result: callResult,
        notes: notes || null,
        lead_id: selected.id,
        user_id: user?.id ?? null,
      }),
      supabase
        .from("leads")
        .update(
          discard
            ? { state: "descartado", discard_reason: callResult }
            : { state: "contactado" },
        )
        .eq("id", selected.id),
    ]);

    setSaving(false);
    setSelected(null);
    setMsg({
      text: discard
        ? `Lead descartado (${callResult}).`
        : "Resultado registrado. El lead queda como Contactado.",
      error: false,
    });
    setVersion((v) => v + 1);
  }

  const pending = leads.filter((l) => l.state === "nuevo");
  const contacted = leads.filter((l) => l.state === "contactado");
  const shown = filter === "pendientes" ? pending : contacted;

  const inputClass =
    "h-10 w-full rounded-lg border border-[#c4c5d5] bg-white px-4 text-sm outline-none transition-all focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20";

  const pill = (active: boolean) =>
    `cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
      active ? "border-[#0b1c30] bg-[#0b1c30] text-white" : "border-[#c4c5d5] bg-white text-[#444653] hover:bg-[#eff4ff]"
    }`;

  return (
    <>
      <ViewTopbar breadcrumb="Embudo · CU-02 / CU-03 / CU-04" title="Calificación de Leads" />
      <div className="p-8">
        {msg && (
          <p className={`mb-5 rounded-lg px-4 py-3 text-sm font-medium ${msg.error ? "bg-[#ba1a1a]/10 text-[#ba1a1a]" : "bg-[#006a61]/10 text-[#006a61]"}`}>
            {msg.text}
          </p>
        )}

        {/* Bandeja */}
        <div className="mb-6 overflow-hidden rounded-xl border border-[#c4c5d5] bg-white">
          <div className="flex items-center justify-between border-b border-[#c4c5d5] px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-[#0b1c30]">Bandeja de leads pendientes</h2>
              <p className="text-xs text-[#757684]">Ordenados por fecha de ingreso y urgencia</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setFilter("pendientes")} className={pill(filter === "pendientes")}>
                Pendientes ({pending.length})
              </button>
              <button onClick={() => setFilter("contactados")} className={pill(filter === "contactados")}>
                Contactados ({contacted.length})
              </button>
            </div>
          </div>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#eff4ff]">
                {["Contacto", "Canal", "Espera", ""].map((h, i) => (
                  <th key={i} className="px-6 py-3 text-[10.5px] font-semibold uppercase tracking-wider text-[#757684]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4c5d5]/50">
              {loading && (
                <tr><td colSpan={4} className="px-6 py-5 text-center text-sm text-[#757684]">Cargando bandeja...</td></tr>
              )}
              {!loading && shown.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-5 text-center text-sm text-[#757684]">
                  {filter === "pendientes" ? "No hay leads pendientes por calificar. 🎉" : "No hay leads contactados en espera."}
                </td></tr>
              )}
              {shown.map((lead) => (
                <tr key={lead.id} className={`transition-colors hover:bg-[#eff4ff]/60 ${selected?.id === lead.id ? "bg-[#e5eeff]" : ""}`}>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dde1ff] text-[11px] font-bold text-[#00288e]">
                        {initials(lead.full_name)}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#0b1c30]">{lead.full_name}</p>
                        <p className="text-[11px] text-[#757684]">{lead.phone ?? lead.email ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-[10.5px] text-[#757684]">{channelLabels[lead.channel]}</td>
                  <td className="px-6 py-3.5 text-[13px] font-semibold text-[#444653]">{waitingTime(lead.created_at)}</td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => { setSelected(lead); setCallResult(CALL_RESULTS[0]); setMsg(null); }}
                      className="rounded px-2.5 py-1 text-xs font-bold text-[#00288e] transition-colors hover:bg-[#eff4ff]"
                    >
                      {selected?.id === lead.id ? "Registrando..." : "Llamar ahora"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Registrar resultado */}
        {selected && (
          <div className="overflow-hidden rounded-xl border border-[#c4c5d5] bg-white">
            <div className="flex items-center justify-between border-b border-[#c4c5d5] px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#0b1c30]">Registrar resultado de llamada</h2>
                <p className="text-xs text-[#757684]">{selected.full_name} · CU-03 {selected.phone ? `· ${selected.phone}` : ""}</p>
              </div>
              <button onClick={() => setSelected(null)} className="material-symbols-outlined text-[#757684] hover:text-[#ba1a1a]">close</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Resultado de la llamada</label>
                  <select
                    value={callResult}
                    onChange={(e) => setCallResult(e.target.value as (typeof CALL_RESULTS)[number])}
                    className={inputClass}
                  >
                    {CALL_RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Observaciones</label>
                  <input type="text" name="notes" placeholder="ej. Interesada en lote de 300m², presupuesto S/45,000..." className={inputClass} />
                </div>
              </div>

              {/* Flujo de estado */}
              <div className="flex items-center gap-2 border-t border-[#c4c5d5]/60 pt-4 text-xs font-semibold">
                <span className="text-[#757684]">Resultado →</span>
                <span className="rounded-full border border-[#c4c5d5] px-3 py-1 text-[#757684]">Lead</span>
                <span className="text-[#757684]">→</span>
                <span className={`rounded-full px-3 py-1 ${isInterested ? "bg-[#0b1c30] text-white" : "border border-dashed border-[#c4c5d5] text-[#c4c5d5] line-through"}`}>
                  Prospecto
                </span>
              </div>

              {isInterested && (
                <div className="rounded-xl border border-[#006a61]/30 bg-[#006a61]/5 p-5">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#006a61]">
                    Datos de conversión (CU-04)
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#444653]">Vendedor asignado *</label>
                      <select name="vendedor" required defaultValue="" className={inputClass}>
                        <option value="" disabled>Selecciona un vendedor...</option>
                        {vendedores.map((v) => <option key={v.id} value={v.id}>{v.full_name}</option>)}
                      </select>
                      {vendedores.length === 0 && (
                        <p className="text-[11px] font-semibold text-[#ba1a1a]">
                          No hay vendedores activos. Pide al administrador que cree uno.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#444653]">Presupuesto (S/)</label>
                      <input type="number" name="budget" min="0" step="500" placeholder="45000" className={inputClass} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#444653]">Área deseada</label>
                      <input type="text" name="desired_area" placeholder="~300 m²" className={inputClass} />
                    </div>
                    <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-[#444653]">
                      <input type="checkbox" name="financing" className="h-4 w-4 rounded border-[#757684] text-[#00288e]" />
                      Pregunta por financiamiento
                    </label>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <p className="max-w-lg rounded-lg border-l-4 border-[#00288e] bg-[#eff4ff] px-4 py-2.5 text-xs leading-relaxed text-[#444653]">
                  <b className="text-[#00288e]">RD-05:</b> la conversión a Prospecto solo ocurre tras confirmar
                  interés explícito en la llamada — no es automática por el solo hecho de contestar.
                </p>
                <button
                  type="submit"
                  disabled={saving || (isInterested && vendedores.length === 0)}
                  className={`shrink-0 rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-70 ${
                    isInterested ? "bg-[#006a61] hover:opacity-90" : "bg-[#00288e] hover:bg-[#00288e]/90"
                  }`}
                >
                  {saving
                    ? "Guardando..."
                    : isInterested
                      ? "Confirmar y convertir a Prospecto"
                      : "Guardar resultado"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
