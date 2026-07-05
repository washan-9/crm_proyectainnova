"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ViewTopbar } from "@/components/view-topbar";

type LeadRow = { id: string; state: string; created_at: string };
type ProspectRow = {
  id: string;
  state: string;
  budget: number | null;
  assignee: { id: string; full_name: string } | null;
};

export default function ReportesPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("leads").select("id, state, created_at"),
      supabase
        .from("prospects")
        .select("id, state, budget, assignee:profiles!assigned_to(id, full_name)"),
    ]).then(([l, p]) => {
      setLeads((l.data ?? []) as LeadRow[]);
      setProspects((p.data ?? []) as unknown as ProspectRow[]);
      setLoading(false);
    });
  }, []);

  const monthStart = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const stats = useMemo(() => {
    const monthLeads = leads.filter((l) => new Date(l.created_at) >= monthStart);
    const enSeguimiento = prospects.filter((p) => p.state === "en_seguimiento").length;
    const conversion =
      leads.length > 0 ? Math.round((prospects.length / leads.length) * 100) : 0;
    return { monthLeads: monthLeads.length, prospects: prospects.length, enSeguimiento, conversion };
  }, [leads, prospects, monthStart]);

  // Leads captados por semana del mes actual
  const weeks = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0];
    for (const l of leads) {
      const d = new Date(l.created_at);
      if (d < monthStart) continue;
      buckets[Math.min(Math.floor((d.getDate() - 1) / 7), 4)]++;
    }
    const list = buckets.slice(0, 4 + (buckets[4] > 0 ? 1 : 0));
    const max = Math.max(...list, 1);
    return list.map((count, i) => ({ label: `Sem ${i + 1}`, count, pct: count / max }));
  }, [leads, monthStart]);

  // Embudo: Lead → Prospecto → Interesado → En Seguimiento
  const funnel = useMemo(() => {
    const interesado = prospects.filter((p) => p.state !== "prospecto" && p.state !== "congelado").length;
    const seguimiento = prospects.filter((p) => p.state === "en_seguimiento").length;
    const rows = [
      { label: "Leads", value: leads.length },
      { label: "Prospectos", value: prospects.length },
      { label: "Interesados", value: interesado },
      { label: "En Seguimiento", value: seguimiento },
    ];
    const max = Math.max(rows[0].value, 1);
    return rows.map((r) => ({ ...r, pct: Math.max((r.value / max) * 100, r.value > 0 ? 10 : 2) }));
  }, [leads, prospects]);

  // Ranking de vendedores (RF-38): prospectos gestionados + pipeline
  const ranking = useMemo(() => {
    const map: Record<string, { name: string; count: number; total: number }> = {};
    for (const p of prospects) {
      if (!p.assignee) continue;
      const entry = (map[p.assignee.id] ??= { name: p.assignee.full_name, count: 0, total: 0 });
      entry.count++;
      entry.total += Number(p.budget ?? 0);
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [prospects]);

  const mes = new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  return (
    <>
      <ViewTopbar breadcrumb="Extensión MVP v2 · CU-13" title="Reportes" />
      <div className="p-8">
        {/* KPIs */}
        <div className="mb-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[
            { label: "Leads (mes)", value: stats.monthLeads, note: "RF-36", accent: "bg-[#00288e]" },
            { label: "Prospectos", value: stats.prospects, note: `${stats.conversion}% del total`, accent: "bg-[#006a61]" },
            { label: "En Seguimiento", value: stats.enSeguimiento, note: "RF-37", accent: "bg-[#ba1a1a]" },
            { label: "Tasa de conversión", value: `${stats.conversion}%`, note: "Calculada automáticamente", accent: "bg-[#00288e]" },
          ].map((s) => (
            <div key={s.label} className="relative overflow-hidden rounded-xl border border-[#c4c5d5] bg-white p-5">
              <p className="text-xs font-semibold text-[#757684]">{s.label}</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-[#0b1c30]">{loading ? "…" : s.value}</p>
              <p className="mt-1 text-[11px] font-semibold text-[#757684]">{s.note}</p>
              <div className={`absolute bottom-0 left-0 right-0 h-1 ${s.accent}`} />
            </div>
          ))}
        </div>

        {/* Leads por semana */}
        <div className="mb-6 overflow-hidden rounded-xl border border-[#c4c5d5] bg-white">
          <div className="border-b border-[#c4c5d5] px-6 py-4">
            <h2 className="text-base font-semibold text-[#0b1c30]">Leads captados por semana</h2>
            <p className="text-xs capitalize text-[#757684]">{mes}</p>
          </div>
          <div className="flex h-44 items-end gap-3 px-6 pb-4 pt-5">
            {weeks.map((w, i) => (
              <div key={w.label} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-xs font-bold text-[#0b1c30]">{w.count}</span>
                <div
                  className={`w-full rounded-t ${i === weeks.findIndex((x) => x.count === Math.max(...weeks.map((y) => y.count))) ? "bg-[#00288e]" : "bg-[#8fa0c9]"}`}
                  style={{ height: `${Math.max(w.pct * 110, 4)}px` }}
                />
                <span className="text-[10px] font-semibold text-[#757684]">{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Embudo */}
        <div className="mb-6 overflow-hidden rounded-xl border border-[#c4c5d5] bg-white">
          <div className="border-b border-[#c4c5d5] px-6 py-4">
            <h2 className="text-base font-semibold text-[#0b1c30]">Embudo de conversión</h2>
            <p className="text-xs text-[#757684]">Lead → Prospecto → Interesado → En Seguimiento</p>
          </div>
          <div className="space-y-2.5 px-6 py-5">
            {funnel.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs font-semibold text-[#444653]">{f.label}</span>
                <div className="h-7 flex-1 overflow-hidden rounded bg-[#eff4ff]">
                  <div
                    className="flex h-full items-center bg-gradient-to-r from-[#00288e] to-[#4a67c0] pl-3"
                    style={{ width: `${f.pct}%` }}
                  >
                    <span className="text-[11px] font-bold text-white">{f.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking */}
        <div className="overflow-hidden rounded-xl border border-[#c4c5d5] bg-white">
          <div className="border-b border-[#c4c5d5] px-6 py-4">
            <h2 className="text-base font-semibold text-[#0b1c30]">Ranking de vendedores</h2>
            <p className="text-xs capitalize text-[#757684]">RF-38 · {mes}</p>
          </div>
          <div className="divide-y divide-[#c4c5d5]/50">
            {!loading && ranking.length === 0 && (
              <p className="p-6 text-sm text-[#757684]">Aún no hay prospectos asignados a vendedores.</p>
            )}
            {ranking.map((r, i) => (
              <div key={r.name} className="flex items-center gap-4 px-6 py-3.5">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    i === 0 ? "bg-[#00288e] text-white" : "bg-[#dde1ff] text-[#00288e]"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-[#0b1c30]">{r.name}</p>
                  <p className="text-[11px] text-[#757684]">{r.count} prospecto{r.count === 1 ? "" : "s"} gestionado{r.count === 1 ? "" : "s"}</p>
                </div>
                <span className="text-[15px] font-bold text-[#0b1c30]">
                  S/ {r.total.toLocaleString("es-PE")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
