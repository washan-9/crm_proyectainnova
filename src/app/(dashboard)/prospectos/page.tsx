"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ViewTopbar } from "@/components/view-topbar";
import { useCurrentUser } from "@/components/current-user-provider";

type ProspectState = "prospecto" | "interesado" | "en_seguimiento" | "congelado";

type Prospect = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  dni: string | null;
  channel: string | null;
  state: ProspectState;
  budget: number | null;
  desired_area: string | null;
  financing: boolean | null;
  last_interaction_at: string;
  created_at: string;
  assignee: { full_name: string } | null;
};

type Interaction = {
  id: string;
  type: "llamada" | "whatsapp" | "reunion" | "nota" | "sistema";
  result: string | null;
  notes: string | null;
  occurred_at: string;
  author: { full_name: string } | null;
};

type LinkedPlot = { plot: { code: string; area_m2: number; price: number } };

const stateLabels: Record<ProspectState, string> = {
  prospecto: "Prospecto",
  interesado: "Interesado",
  en_seguimiento: "En Seguimiento",
  congelado: "Congelado",
};

const stateTagCls: Record<ProspectState, string> = {
  prospecto: "bg-[#00288e]/10 text-[#00288e]",
  interesado: "bg-[#006a61]/10 text-[#006a61]",
  en_seguimiento: "bg-[#8a6b2e]/10 text-[#8a6b2e]",
  congelado: "bg-[#5d7a9a]/15 text-[#5d7a9a]",
};

// Ciclo completo — Reserva y Venta bloqueados (RD-06, fuera del MVP v1)
const FLOW: ProspectState[] = ["prospecto", "interesado", "en_seguimiento"];

const dotCls: Record<Interaction["type"], string> = {
  llamada: "bg-[#3457a6]",
  whatsapp: "bg-[#006a61]",
  reunion: "bg-[#00288e]",
  nota: "bg-[#757684]",
  sistema: "bg-[#8a6b2e]",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function ProspectosPage() {
  const { currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "administrador";

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Interaction[]>([]);
  const [plots, setPlots] = useState<LinkedPlot[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const supabase = createClient();
    // RLS ya restringe: el vendedor solo recibe su cartera (RD-10)
    supabase
      .from("prospects")
      .select(
        `id, full_name, email, phone, dni, channel, state, budget, desired_area,
         financing, last_interaction_at, created_at,
         assignee:profiles!assigned_to(full_name)`,
      )
      .order("last_interaction_at", { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as unknown as Prospect[];
        setProspects(rows);
        if (rows.length > 0) setSelectedId((prev) => prev ?? rows[0].id);
        setLoading(false);
      });
  }, [currentUser]);

  useEffect(() => {
    if (!selectedId) return;
    const supabase = createClient();
    supabase
      .from("interactions")
      .select("id, type, result, notes, occurred_at, author:profiles(full_name)")
      .eq("prospect_id", selectedId)
      .order("occurred_at", { ascending: false })
      .then(({ data }) => setHistory((data ?? []) as unknown as Interaction[]));

    supabase
      .from("prospect_plots")
      .select("plot:plots(code, area_m2, price)")
      .eq("prospect_id", selectedId)
      .then(({ data }) => setPlots((data ?? []) as unknown as LinkedPlot[]));
  }, [selectedId]);

  const selected = prospects.find((p) => p.id === selectedId) ?? null;

  async function updateState(state: ProspectState) {
    if (!selected) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    setProspects((prev) => prev.map((p) => (p.id === selected.id ? { ...p, state } : p)));
    await supabase.from("prospects").update({ state, frozen_at: null }).eq("id", selected.id);
    await supabase.from("interactions").insert({
      type: "nota",
      result: `Estado actualizado a ${stateLabels[state]}`,
      prospect_id: selected.id,
      user_id: user?.id ?? null,
    });
    setToast(`Estado actualizado a ${stateLabels[state]}.`);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <>
      <ViewTopbar breadcrumb="Embudo · CU-05" title="Gestión de Prospectos" />
      <div className="grid grid-cols-12 gap-6 p-8">
        {/* Cartera */}
        <div className="col-span-12 xl:col-span-4">
          <div className="overflow-hidden rounded-xl border border-[#c4c5d5] bg-white">
            <div className="border-b border-[#c4c5d5] px-5 py-4">
              <h2 className="text-base font-semibold text-[#0b1c30]">
                {isAdmin ? "Todas las carteras" : "Mi cartera"}
              </h2>
              <p className="text-xs text-[#757684]">
                {isAdmin ? "Vista global (Administrador)" : "Solo tus prospectos asignados (RD-10)"}
              </p>
            </div>
            <div className="max-h-[70vh] divide-y divide-[#c4c5d5]/50 overflow-y-auto">
              {loading && <p className="p-5 text-sm text-[#757684]">Cargando cartera...</p>}
              {!loading && prospects.length === 0 && (
                <p className="p-5 text-sm text-[#757684]">
                  {isAdmin ? "No hay prospectos registrados." : "Aún no tienes prospectos asignados."}
                </p>
              )}
              {prospects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[#eff4ff] ${
                    selectedId === p.id ? "bg-[#e5eeff]" : ""
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dde1ff] text-xs font-bold text-[#00288e]">
                    {initials(p.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#0b1c30]">{p.full_name}</p>
                    <p className="truncate text-[11px] text-[#757684]">
                      {isAdmin && p.assignee ? `Vendedor: ${p.assignee.full_name}` : (p.desired_area ?? p.phone ?? "—")}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${stateTagCls[p.state]}`}>
                    {stateLabels[p.state]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ficha */}
        <div className="col-span-12 xl:col-span-8">
          {!selected ? (
            <div className="rounded-xl border border-[#c4c5d5] bg-white p-10 text-center text-sm text-[#757684]">
              Selecciona un prospecto de la cartera para ver su ficha.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[2fr_1fr]">
              <div className="space-y-5">
                <div className="overflow-hidden rounded-xl border border-[#c4c5d5] bg-white">
                  <div className="flex items-center justify-between border-b border-[#c4c5d5] px-6 py-4">
                    <div>
                      <h2 className="text-lg font-semibold text-[#0b1c30]">{selected.full_name}</h2>
                      <p className="text-xs text-[#757684]">
                        Prospecto desde el{" "}
                        {new Date(selected.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                        {selected.assignee ? ` · Asignado a ${selected.assignee.full_name}` : ""}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${stateTagCls[selected.state]}`}>
                      {stateLabels[selected.state]}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 px-6 py-4 text-[11px] font-bold">
                    <span className="rounded-full border border-[#c4c5d5] px-3 py-1.5 text-[#757684]">Lead</span>
                    <span className="text-[#c4c5d5]">→</span>
                    {FLOW.map((s, i) => (
                      <span key={s} className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1.5 ${
                            selected.state === s
                              ? "bg-[#0b1c30] text-white"
                              : "border border-[#c4c5d5] text-[#757684]"
                          }`}
                        >
                          {stateLabels[s]}
                        </span>
                        {i < FLOW.length - 1 && <span className="text-[#c4c5d5]">→</span>}
                      </span>
                    ))}
                    {selected.state === "congelado" && (
                      <>
                        <span className="text-[#c4c5d5]">→</span>
                        <span className="rounded-full bg-[#5d7a9a] px-3 py-1.5 text-white">Congelado</span>
                      </>
                    )}
                    <span className="ml-1 text-[#c4c5d5]">···</span>
                    <span className="rounded-full border border-dashed border-[#c4c5d5] px-3 py-1.5 text-[#c4c5d5] line-through">Reserva</span>
                    <span className="rounded-full border border-dashed border-[#c4c5d5] px-3 py-1.5 text-[#c4c5d5] line-through">Venta</span>
                  </div>
                  <div className="px-6 pb-5">
                    <p className="rounded-lg border-l-4 border-[#00288e] bg-[#eff4ff] px-4 py-2.5 text-xs leading-relaxed text-[#444653]">
                      <b className="text-[#00288e]">RD-06 (ajustado):</b> &quot;Reserva&quot; y &quot;Venta&quot; no forman parte
                      del alcance del MVP v1 — visibles como referencia del ciclo completo, pero bloqueadas.
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-[#c4c5d5] bg-white">
                  <div className="border-b border-[#c4c5d5] px-6 py-4">
                    <h2 className="text-base font-semibold text-[#0b1c30]">Historial de interacciones</h2>
                    <p className="text-xs text-[#757684]">Fuente única — sin registros en Excel externo (RNF-17)</p>
                  </div>
                  <div className="px-6 py-2">
                    {history.length === 0 && <p className="py-4 text-sm text-[#757684]">Sin interacciones registradas.</p>}
                    {history.map((it) => (
                      <div key={it.id} className="flex gap-3.5 border-b border-[#c4c5d5]/40 py-3.5 last:border-b-0">
                        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotCls[it.type]}`} />
                        <div>
                          <p className="text-[13px] font-semibold text-[#0b1c30]">{it.result ?? it.type}</p>
                          <p className="text-[11px] text-[#757684]">
                            {formatDateTime(it.occurred_at)} · {it.author?.full_name ?? "sistema (automático)"}
                          </p>
                          {it.notes && <p className="mt-1 text-xs leading-relaxed text-[#444653]">{it.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-[#c4c5d5] bg-white p-5">
                  <h3 className="mb-3 text-sm font-semibold text-[#0b1c30]">Datos de contacto</h3>
                  {[
                    ["Correo", selected.email ?? "—"],
                    ["Celular", selected.phone ?? "—"],
                    ["Canal", selected.channel?.replace("_", " ") ?? "—"],
                    ["DNI", selected.dni ? `••••••${selected.dni.slice(-2)} 🔒` : "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-[#c4c5d5]/40 py-2 text-[12.5px] last:border-b-0">
                      <span className="text-[#757684]">{k}</span>
                      <span className="font-semibold text-[#0b1c30]">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-[#c4c5d5] bg-white p-5">
                  <h3 className="mb-3 text-sm font-semibold text-[#0b1c30]">Interés registrado</h3>
                  {[
                    ["Presupuesto", selected.budget ? `S/ ${Number(selected.budget).toLocaleString("es-PE")}` : "—"],
                    ["Área deseada", selected.desired_area ?? "—"],
                    ["Financiamiento", selected.financing == null ? "—" : selected.financing ? "Sí, consultar" : "No"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-[#c4c5d5]/40 py-2 text-[12.5px] last:border-b-0">
                      <span className="text-[#757684]">{k}</span>
                      <span className="font-semibold text-[#0b1c30]">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-[#c4c5d5] bg-white p-5">
                  <h3 className="mb-3 text-sm font-semibold text-[#0b1c30]">Lotes de interés</h3>
                  {plots.length === 0 && <p className="text-xs text-[#757684]">Sin lotes asociados. Asócialos desde Gestión de Terrenos.</p>}
                  {plots.map(({ plot }) => (
                    <div key={plot.code} className="flex justify-between border-b border-[#c4c5d5]/40 py-2 text-[12.5px] last:border-b-0">
                      <span className="font-mono font-semibold text-[#00288e]">{plot.code}</span>
                      <span className="text-[#444653]">{plot.area_m2} m² · S/ {Number(plot.price).toLocaleString("es-PE")}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-[#c4c5d5] bg-white p-5">
                  <h3 className="mb-3 text-sm font-semibold text-[#0b1c30]">Acciones</h3>
                  <Link
                    href="/reuniones"
                    className="block w-full rounded-lg bg-[#00288e] py-2.5 text-center text-sm font-semibold text-white shadow-md transition-all hover:bg-[#00288e]/90"
                  >
                    Registrar nueva reunión
                  </Link>
                  <div className="mt-3 space-y-1">
                    <label className="text-xs font-semibold text-[#444653]">Actualizar estado</label>
                    <select
                      value={selected.state}
                      onChange={(e) => updateState(e.target.value as ProspectState)}
                      className="h-10 w-full rounded-lg border border-[#c4c5d5] bg-white px-3 text-sm font-semibold outline-none focus:border-[#00288e]"
                    >
                      {FLOW.map((s) => <option key={s} value={s}>{stateLabels[s]}</option>)}
                      <option value="congelado">Congelado</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-8 right-8 z-[100] rounded-lg bg-[#213145] px-6 py-4 text-sm text-white shadow-lg">
          ✓ {toast}
        </div>
      )}
    </>
  );
}
