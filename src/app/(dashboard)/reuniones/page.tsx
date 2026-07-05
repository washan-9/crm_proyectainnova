"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ViewTopbar } from "@/components/view-topbar";
import { useCurrentUser } from "@/components/current-user-provider";

type MeetingStatus = "programada" | "realizada" | "no_asistio" | "cancelada";

type Meeting = {
  id: string;
  purpose: string;
  scheduled_at: string;
  modality: "virtual" | "presencial";
  location: string | null;
  status: MeetingStatus;
  result_notes: string | null;
  commitment: string | null;
  commitment_due: string | null;
  prospect: { id: string; full_name: string } | null;
};

type ProspectOption = { id: string; full_name: string };

const statusCfg: Record<MeetingStatus, { label: string; cls: string }> = {
  programada: { label: "Programada", cls: "bg-[#00288e]/10 text-[#00288e]" },
  realizada: { label: "Realizada", cls: "bg-[#006a61]/10 text-[#006a61]" },
  no_asistio: { label: "No asistió", cls: "bg-[#ba1a1a]/10 text-[#ba1a1a]" },
  cancelada: { label: "Cancelada", cls: "bg-[#757684]/10 text-[#757684]" },
};

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export default function ReunionesPage() {
  const { currentUser } = useCurrentUser();
  const readOnly = currentUser?.role === "administrador"; // admin solo consulta

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [prospects, setProspects] = useState<ProspectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"todas" | "programada" | "realizada">("todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [resultFor, setResultFor] = useState<Meeting | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    // RLS: el vendedor solo recibe reuniones de sus prospectos
    supabase
      .from("meetings")
      .select(
        `id, purpose, scheduled_at, modality, location, status, result_notes,
         commitment, commitment_due, prospect:prospects(id, full_name)`,
      )
      .order("scheduled_at", { ascending: false })
      .then(({ data }) => {
        setMeetings((data ?? []) as unknown as Meeting[]);
        setLoading(false);
      });

    supabase
      .from("prospects")
      .select("id, full_name")
      .neq("state", "congelado")
      .order("full_name")
      .then(({ data }) => setProspects((data ?? []) as ProspectOption[]));
  }, [version]);

  function showToast(text: string) {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("meetings").insert({
      prospect_id: form.get("prospect_id") as string,
      purpose: (form.get("purpose") as string).trim(),
      scheduled_at: new Date(`${form.get("date")}T${form.get("time")}`).toISOString(),
      modality: form.get("modality") as string,
      location: ((form.get("location") as string) || "").trim() || null,
      created_by: user?.id ?? null,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setModalOpen(false);
    showToast("Reunión programada.");
    setVersion((v) => v + 1);
  }

  // CU-06 · RD-07: el resultado y el compromiso pendiente quedan en el
  // historial del prospecto y alimentan las alertas de Seguimiento
  async function handleResult(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resultFor?.prospect) return;
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const status = form.get("status") as MeetingStatus;
    const commitment = ((form.get("commitment") as string) || "").trim() || null;
    const commitmentDue = (form.get("commitment_due") as string) || null;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error: updError } = await supabase
      .from("meetings")
      .update({ status, commitment, commitment_due: commitmentDue, result_notes: commitment })
      .eq("id", resultFor.id);

    if (updError) {
      setSaving(false);
      setError(updError.message);
      return;
    }

    await Promise.all([
      supabase.from("interactions").insert({
        type: "reunion",
        result: status === "realizada" ? "Reunión realizada" : "Reunión — no asistió",
        notes: commitment ? `Compromiso: ${commitment}` : null,
        prospect_id: resultFor.prospect.id,
        user_id: user?.id ?? null,
      }),
      status === "realizada"
        ? supabase.from("prospects").update({ state: "en_seguimiento" }).eq("id", resultFor.prospect.id)
        : Promise.resolve(),
    ]);

    setSaving(false);
    setResultFor(null);
    showToast("Resultado y compromiso guardados.");
    setVersion((v) => v + 1);
  }

  const shown = meetings.filter((m) => filter === "todas" || m.status === filter);

  const inputClass =
    "h-10 w-full rounded-lg border border-[#c4c5d5] bg-white px-4 text-sm outline-none transition-all focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20";

  const pill = (active: boolean) =>
    `cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
      active ? "border-[#0b1c30] bg-[#0b1c30] text-white" : "border-[#c4c5d5] bg-white text-[#444653] hover:bg-[#eff4ff]"
    }`;

  return (
    <>
      <ViewTopbar
        breadcrumb="Continuidad · CU-06"
        title="Gestión de Reuniones"
        actions={
          !readOnly ? (
            <button
              onClick={() => { setError(null); setModalOpen(true); }}
              className="rounded-lg bg-[#00288e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
            >
              + Nueva reunión
            </button>
          ) : undefined
        }
      />
      <div className="p-8">
        <div className="overflow-hidden rounded-xl border border-[#c4c5d5] bg-white">
          <div className="flex items-center justify-between border-b border-[#c4c5d5] px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-[#0b1c30]">Próximas reuniones</h2>
              <p className="text-xs text-[#757684]">
                {readOnly ? "Vista de consulta (Administrador)" : "Reuniones de tus prospectos asignados"}
              </p>
            </div>
            <div className="flex gap-2">
              {(["todas", "programada", "realizada"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={pill(filter === f)}>
                  {f === "todas" ? "Todas" : f === "programada" ? "Programadas" : "Realizadas"}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-[#c4c5d5]/50">
            {loading && <p className="p-6 text-sm text-[#757684]">Cargando reuniones...</p>}
            {!loading && shown.length === 0 && (
              <p className="p-6 text-sm text-[#757684]">No hay reuniones en esta vista.</p>
            )}
            {shown.map((m) => {
              const d = new Date(m.scheduled_at);
              return (
                <div key={m.id} className="flex items-start gap-4 px-6 py-4">
                  <div className="w-14 shrink-0 rounded-lg bg-[#dde1ff] py-2 text-center">
                    <p className="text-lg font-bold leading-none text-[#00288e]">
                      {String(d.getDate()).padStart(2, "0")}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#757684]">
                      {MONTHS[d.getMonth()]}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-[#0b1c30]">
                      {m.prospect?.full_name ?? "—"} — {m.purpose}
                    </p>
                    <p className="text-[11.5px] text-[#757684]">
                      Modalidad {m.modality}
                      {m.location ? ` · ${m.location}` : ""} ·{" "}
                      {d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {m.commitment && (
                      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#8a6b2e]/10 px-2.5 py-1 text-[11px] font-bold text-[#8a6b2e]">
                        📌 Compromiso: {m.commitment}
                        {m.commitment_due
                          ? ` · vence ${new Date(m.commitment_due + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`
                          : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusCfg[m.status].cls}`}>
                      {statusCfg[m.status].label}
                    </span>
                    {!readOnly && m.status === "programada" && (
                      <button
                        onClick={() => { setError(null); setResultFor(m); }}
                        className="rounded px-2 py-1 text-xs font-bold text-[#00288e] hover:bg-[#eff4ff]"
                      >
                        Registrar resultado →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-5 max-w-3xl rounded-lg border-l-4 border-[#00288e] bg-[#eff4ff] px-4 py-3 text-xs leading-relaxed text-[#444653]">
          <b className="text-[#00288e]">RD-07:</b> todo acuerdo verbal relevante queda registrado como compromiso
          pendiente asociado al prospecto, con fecha de vencimiento — evita que dependa de la memoria del vendedor.
          Este registro alimenta directamente las alertas de Seguimiento Comercial.
        </p>
      </div>

      {/* Modal: Nueva reunión */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1c30]/50 p-4" onMouseDown={() => setModalOpen(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#c4c5d5] bg-[#eff4ff] px-6 py-4">
              <h3 className="text-lg font-semibold text-[#0b1c30]">Nueva Reunión</h3>
              <button onClick={() => setModalOpen(false)} className="material-symbols-outlined text-[#757684] hover:text-[#ba1a1a]">close</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 p-6">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#444653]">Prospecto *</label>
                <select name="prospect_id" required defaultValue="" className={inputClass}>
                  <option value="" disabled>Selecciona un prospecto...</option>
                  {prospects.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#444653]">Motivo *</label>
                <input type="text" name="purpose" required autoFocus placeholder="ej. Reunión de seguimiento" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Fecha *</label>
                  <input type="date" name="date" required defaultValue={new Date().toLocaleDateString("sv-SE")} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Hora *</label>
                  <input type="time" name="time" required defaultValue="10:00" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Modalidad</label>
                  <select name="modality" defaultValue="virtual" className={inputClass}>
                    <option value="virtual">Virtual</option>
                    <option value="presencial">Presencial</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Lugar (opcional)</label>
                  <input type="text" name="location" placeholder="ej. Oficina Huacho" className={inputClass} />
                </div>
              </div>
              {error && <p className="rounded-lg bg-[#ba1a1a]/10 px-4 py-2 text-sm font-medium text-[#ba1a1a]">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-[#c4c5d5] px-6 py-2 text-sm font-semibold text-[#444653] hover:bg-[#eff4ff]">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-[#00288e] px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#00288e]/90 disabled:opacity-70">
                  {saving ? "Guardando..." : "Programar Reunión"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar resultado y compromiso */}
      {resultFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1c30]/50 p-4" onMouseDown={() => setResultFor(null)}>
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#c4c5d5] bg-[#eff4ff] px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-[#0b1c30]">Registrar resultado y compromiso pendiente</h3>
                <p className="text-xs text-[#757684]">{resultFor.prospect?.full_name} · CU-06</p>
              </div>
              <button onClick={() => setResultFor(null)} className="material-symbols-outlined text-[#757684] hover:text-[#ba1a1a]">close</button>
            </div>
            <form onSubmit={handleResult} className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Resultado de la reunión</label>
                  <select name="status" defaultValue="realizada" className={inputClass}>
                    <option value="realizada">Realizada</option>
                    <option value="no_asistio">No asistió</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Fecha estimada de seguimiento</label>
                  <input type="date" name="commitment_due" className={inputClass} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#444653]">Compromiso pendiente acordado</label>
                <textarea
                  name="commitment"
                  rows={3}
                  placeholder="ej. Cliente quiere traer a su hermano a la próxima reunión antes de decidir."
                  className="w-full rounded-lg border border-[#c4c5d5] p-3 text-sm outline-none focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20"
                />
              </div>
              {error && <p className="rounded-lg bg-[#ba1a1a]/10 px-4 py-2 text-sm font-medium text-[#ba1a1a]">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setResultFor(null)} className="rounded-lg border border-[#c4c5d5] px-6 py-2 text-sm font-semibold text-[#444653] hover:bg-[#eff4ff]">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-[#006a61] px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-70">
                  {saving ? "Guardando..." : "Guardar compromiso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 right-8 z-[100] rounded-lg bg-[#213145] px-6 py-4 text-sm text-white shadow-lg">
          ✓ {toast}
        </div>
      )}
    </>
  );
}
