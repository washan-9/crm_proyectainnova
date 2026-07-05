"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";
import { ViewTopbar } from "@/components/view-topbar";

type Channel = "facebook_ads" | "instagram" | "referido" | "google_ads" | "otro";
type LeadState = "nuevo" | "contactado" | "descartado" | "convertido";

type Lead = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  channel: Channel;
  origin: string;
  state: LeadState;
  discard_reason: string | null;
  created_at: string;
};

const channelLabels: Record<Channel, string> = {
  facebook_ads: "FACEBOOK_ADS",
  instagram: "INSTAGRAM",
  referido: "REFERIDO",
  google_ads: "GOOGLE_ADS",
  otro: "OTRO",
};

const stateTags: Record<LeadState, { label: string; cls: string }> = {
  nuevo: { label: "Nuevo", cls: "bg-[#00288e]/10 text-[#00288e]" },
  contactado: { label: "Contactado", cls: "bg-[#006a61]/10 text-[#006a61]" },
  descartado: { label: "Bloqueado (RF-05)", cls: "bg-[#ba1a1a]/10 text-[#ba1a1a]" },
  convertido: { label: "Convertido", cls: "bg-[#6bd8cb]/30 text-[#00201d]" },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s-]{5,}$/;

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const time = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Hoy, ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Ayer, ${time}`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }) + `, ${time}`;
}

export default function CaptacionPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [originFilter, setOriginFilter] = useState<"todos" | "zapier" | "manual">("todos");
  const [version, setVersion] = useState(0);

  // Validación en tiempo real (RD-09) — inputs no controlados,
  // solo se guarda el estado de error
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("leads")
      .select("id, full_name, email, phone, channel, origin, state, discard_reason, created_at")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setLeads((data ?? []) as Lead[]);
        setLoading(false);
      });
  }, [version]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const stats = useMemo(() => {
    const today = leads.filter((l) => new Date(l.created_at) >= todayStart);
    const zapier = today.filter((l) => l.origin === "zapier").length;
    const dups = leads.filter(
      (l) => l.state === "descartado" && (l.discard_reason ?? "").includes("RF-05"),
    ).length;
    const byChannel: Record<string, number> = {};
    for (const l of leads) byChannel[l.channel] = (byChannel[l.channel] ?? 0) + 1;
    const top = Object.entries(byChannel).sort((a, b) => b[1] - a[1])[0];
    const topPct = top && leads.length > 0 ? Math.round((top[1] / leads.length) * 100) : 0;
    return {
      today: today.length,
      zapier,
      dups,
      topChannel: top ? channelLabels[top[0] as Channel] : "—",
      topPct,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads]);

  function validateEmail(value: string) {
    if (value === "") return setEmailError(null);
    setEmailError(
      EMAIL_RE.test(value)
        ? null
        : value.includes("@")
          ? "Formato de correo inválido (RD-09)"
          : 'Formato inválido — falta el carácter "@" (RD-09)',
    );
  }

  function validatePhone(value: string) {
    if (value === "") return setPhoneError(null);
    setPhoneError(
      PHONE_RE.test(value.trim())
        ? null
        : "Solo se permiten dígitos numéricos (RD-09)",
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (emailError || phoneError) return;
    setSaving(true);
    setFormMsg(null);

    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const fullName = (form.get("full_name") as string).trim();
    const email = ((form.get("email") as string) || "").trim() || null;
    const phone = ((form.get("phone") as string) || "").trim() || null;
    const channel = form.get("channel") as Channel;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // RF-05: bloqueo de duplicados por teléfono o correo
    // (contra leads existentes y prospectos ya convertidos)
    const checks: string[] = [];
    if (phone) checks.push(`phone.eq.${phone}`);
    if (email) checks.push(`email.eq.${email}`);

    if (checks.length > 0) {
      const [{ data: dupLeads }, { data: dupProspects }] = await Promise.all([
        supabase.from("leads").select("id").neq("state", "descartado").or(checks.join(",")).limit(1),
        supabase.from("prospects").select("id").or(checks.join(",")).limit(1),
      ]);

      if ((dupLeads?.length ?? 0) > 0 || (dupProspects?.length ?? 0) > 0) {
        await supabase.from("leads").insert({
          full_name: fullName,
          email,
          phone,
          channel,
          origin: "manual",
          state: "descartado",
          discard_reason: "Duplicado bloqueado (RF-05)",
          created_by: user?.id ?? null,
        });
        await logAudit(
          "Lead duplicado bloqueado",
          `${phone ?? email} ya registrado (RF-05). Intento manual: ${fullName}.`,
          "sistema (automático)",
        );
        setSaving(false);
        setFormMsg({
          text: "Duplicado detectado (RF-05): este teléfono o correo ya existe en el sistema. El intento quedó bloqueado y auditado.",
          error: true,
        });
        setVersion((v) => v + 1);
        return;
      }
    }

    const { error } = await supabase.from("leads").insert({
      full_name: fullName,
      email,
      phone,
      channel,
      origin: "manual",
      state: "nuevo",
      created_by: user?.id ?? null,
    });

    setSaving(false);
    if (error) {
      setFormMsg({ text: `Error al guardar: ${error.message}`, error: true });
      return;
    }
    formEl.reset();
    setFormMsg({ text: "Lead registrado correctamente.", error: false });
    setVersion((v) => v + 1);
  }

  const filtered = leads.filter(
    (l) => originFilter === "todos" || l.origin === originFilter,
  );

  const inputClass =
    "h-10 w-full rounded-lg border border-[#c4c5d5] bg-white px-4 text-sm outline-none transition-all focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20";

  const pill = (active: boolean) =>
    `cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
      active
        ? "border-[#0b1c30] bg-[#0b1c30] text-white"
        : "border-[#c4c5d5] bg-white text-[#444653] hover:bg-[#eff4ff]"
    }`;

  return (
    <>
      <ViewTopbar breadcrumb="Embudo · CU-01" title="Captación de Leads" />
      <div className="p-8">
        {/* Stats */}
        <div className="mb-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[
            { label: "Leads hoy", value: stats.today, note: "Registrados en el día", accent: "bg-[#00288e]" },
            { label: "Vía Zapier", value: stats.zapier, note: "Automático", accent: "bg-[#006a61]" },
            { label: "Duplicados evitados", value: stats.dups, note: "RF-05", accent: "bg-[#ba1a1a]" },
            { label: "Canal top", value: stats.topChannel, note: `${stats.topPct}% del total`, accent: "bg-[#00288e]" },
          ].map((s) => (
            <div key={s.label} className="relative overflow-hidden rounded-xl border border-[#c4c5d5] bg-white p-5">
              <p className="text-xs font-semibold text-[#757684]">{s.label}</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-[#0b1c30]">
                {loading ? "…" : s.value}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[#757684]">{s.note}</p>
              <div className={`absolute bottom-0 left-0 right-0 h-1 ${s.accent}`} />
            </div>
          ))}
        </div>

        {/* Registrar lead manual */}
        <div className="mb-6 overflow-hidden rounded-xl border border-[#c4c5d5] bg-white">
          <div className="border-b border-[#c4c5d5] px-6 py-4">
            <h2 className="text-base font-semibold text-[#0b1c30]">Registrar Lead manual</h2>
            <p className="text-xs text-[#757684]">
              CU-01 — validación de formato en tiempo real (RD-09)
            </p>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#444653]">Nombres y Apellidos *</label>
              <input type="text" name="full_name" required placeholder="ej. Marco Antonio Vega Ríos" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#444653]">Correo electrónico</label>
              <input
                type="text"
                name="email"
                placeholder="nombre@correo.com"
                onChange={(e) => validateEmail(e.target.value)}
                className={`${inputClass} ${emailError ? "border-[#ba1a1a] bg-[#ba1a1a]/5" : ""}`}
              />
              {emailError && (
                <p className="text-[11px] font-semibold text-[#ba1a1a]">{emailError}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#444653]">Celular</label>
              <input
                type="text"
                name="phone"
                placeholder="+51 987 654 321"
                onChange={(e) => validatePhone(e.target.value)}
                className={`${inputClass} ${phoneError ? "border-[#ba1a1a] bg-[#ba1a1a]/5" : ""}`}
              />
              {phoneError && (
                <p className="text-[11px] font-semibold text-[#ba1a1a]">{phoneError}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#444653]">Canal de origen</label>
              <select name="channel" defaultValue="facebook_ads" className={inputClass}>
                <option value="facebook_ads">Facebook Ads</option>
                <option value="instagram">Instagram</option>
                <option value="referido">Referido</option>
                <option value="google_ads">Google Ads</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            {formMsg && (
              <p
                className={`md:col-span-2 rounded-lg px-4 py-2 text-sm font-medium ${
                  formMsg.error
                    ? "bg-[#ba1a1a]/10 text-[#ba1a1a]"
                    : "bg-[#006a61]/10 text-[#006a61]"
                }`}
              >
                {formMsg.text}
              </p>
            )}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#00288e] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#00288e]/90 active:scale-[0.98] disabled:opacity-70"
              >
                {saving ? "Guardando..." : "Guardar Lead"}
              </button>
            </div>
          </form>
        </div>

        {/* Últimos leads */}
        <div className="overflow-hidden rounded-xl border border-[#c4c5d5] bg-white">
          <div className="flex items-center justify-between border-b border-[#c4c5d5] px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-[#0b1c30]">Últimos leads ingresados</h2>
              <p className="text-xs text-[#757684]">Fuente: integración Zapier + registro manual</p>
            </div>
            <div className="flex gap-2">
              {(["todos", "zapier", "manual"] as const).map((f) => (
                <button key={f} onClick={() => setOriginFilter(f)} className={pill(originFilter === f)}>
                  {f === "todos" ? "Todos" : f === "zapier" ? "Zapier" : "Manual"}
                </button>
              ))}
            </div>
          </div>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#eff4ff]">
                {["Contacto", "Canal", "Fecha", "Estado", ""].map((h, i) => (
                  <th key={i} className="px-6 py-3 text-[10.5px] font-semibold uppercase tracking-wider text-[#757684]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4c5d5]/50">
              {loading && (
                <tr><td colSpan={5} className="px-6 py-5 text-center text-sm text-[#757684]">Cargando leads...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-5 text-center text-sm text-[#757684]">No hay leads registrados aún.</td></tr>
              )}
              {filtered.map((lead) => (
                <tr key={lead.id} className={`transition-colors hover:bg-[#eff4ff]/60 ${lead.state === "descartado" ? "opacity-55" : ""}`}>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dde1ff] text-[11px] font-bold text-[#00288e]">
                        {initials(lead.full_name)}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#0b1c30]">{lead.full_name}</p>
                        <p className="text-[11px] text-[#757684]">{lead.email ?? lead.phone ?? "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-[10.5px] text-[#757684]">
                    {channelLabels[lead.channel]}
                  </td>
                  <td className="px-6 py-3.5 text-[13px] text-[#444653]">{formatWhen(lead.created_at)}</td>
                  <td className="px-6 py-3.5">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${stateTags[lead.state].cls}`}>
                      {stateTags[lead.state].label}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {(lead.state === "nuevo" || lead.state === "contactado") && (
                      <Link href="/calificacion" className="rounded px-2 py-1 text-xs font-bold text-[#00288e] hover:bg-[#eff4ff]">
                        Calificar →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
