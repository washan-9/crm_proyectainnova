"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DealStatus = "abierto" | "ganado" | "perdido";

type Deal = {
  id: string;
  title: string;
  amount: number;
  status: DealStatus;
  closed_at: string | null;
  created_at: string;
  owner: { id: string; full_name: string } | null;
};

const months = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

const avatarPalette = [
  { bg: "bg-[#86f2e4]", text: "text-[#006f66]" },
  { bg: "bg-[#1e40af]", text: "text-[#a8b8ff]" },
  { bg: "bg-[#484c4e]", text: "text-[#e0e3e5]" },
  { bg: "bg-[#d3e4fe]", text: "text-[#0b1c30]" },
];

function avatarFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return avatarPalette[hash % avatarPalette.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 1) return "Hace menos de 1 hora";
  if (hours < 24) return `Hace ${hours} hora${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

type LeadRow = {
  id: string;
  status: "nuevo" | "contactado" | "calificado" | "perdido";
  created_at: string;
};

export default function ReportesPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("deals")
        .select(
          "id, title, amount, status, closed_at, created_at, owner:profiles(id, full_name)",
        )
        .order("created_at", { ascending: false }),
      supabase.from("leads").select("id, status, created_at"),
    ]).then(([dealsRes, leadsRes]) => {
      setDeals((dealsRes.data ?? []) as unknown as Deal[]);
      setLeads((leadsRes.data ?? []) as LeadRow[]);
      setLoading(false);
    });
  }, []);

  const currentYear = new Date().getFullYear();

  // Leads captados y calificados por mes (año actual)
  const monthlyLeads = useMemo(() => {
    const total = new Array(12).fill(0);
    const qualified = new Array(12).fill(0);
    for (const lead of leads) {
      const created = new Date(lead.created_at);
      if (created.getFullYear() !== currentYear) continue;
      total[created.getMonth()] += 1;
      if (lead.status === "calificado") qualified[created.getMonth()] += 1;
    }
    return { total, qualified };
  }, [leads, currentYear]);

  const totalLeadsYear = monthlyLeads.total.reduce((a, b) => a + b, 0);
  const qualifiedLeadsYear = monthlyLeads.qualified.reduce((a, b) => a + b, 0);

  const chartPaths = useMemo(() => {
    const max = Math.max(...monthlyLeads.total, 1);
    const toPoints = (values: number[]) =>
      values
        .map((value, i) => {
          const x = (i * 1000) / 11;
          const y = 190 - (value / max) * 170;
          return `${x.toFixed(0)},${y.toFixed(0)}`;
        })
        .join(" L");
    const line = `M${toPoints(monthlyLeads.total)}`;
    const area = `${line} L1000,200 L0,200 Z`;
    const qualifiedLine = `M${toPoints(monthlyLeads.qualified)}`;
    return { line, area, qualifiedLine };
  }, [monthlyLeads]);

  // Desempeño: negocios ganados por agente
  const teamPerformance = useMemo(() => {
    const byOwner = new Map<string, { name: string; deals: number }>();
    for (const deal of deals) {
      if (deal.status !== "ganado" || !deal.owner) continue;
      const entry = byOwner.get(deal.owner.id) ?? {
        name: deal.owner.full_name,
        deals: 0,
      };
      entry.deals += 1;
      byOwner.set(deal.owner.id, entry);
    }
    const list = [...byOwner.values()].sort((a, b) => b.deals - a.deals);
    const max = list[0]?.deals ?? 1;
    return list.map((agent) => ({
      ...agent,
      performance: Math.round((agent.deals / max) * 100),
    }));
  }, [deals]);

  // Historial: negocios cerrados recientes
  const dealHistory = useMemo(
    () =>
      deals
        .filter((d) => d.status !== "abierto" && d.closed_at)
        .sort(
          (a, b) =>
            new Date(b.closed_at!).getTime() -
            new Date(a.closed_at!).getTime(),
        )
        .slice(0, 5),
    [deals],
  );

  return (
    <>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-[#0b1c30]">
            Reportes y Analítica
          </h2>
          <p className="text-base text-[#757684]">
            Métricas de desempeño en tiempo real y resumen de datos de ventas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Ingresos */}
        <div className="col-span-12 rounded-xl border border-[#c4c5d5] bg-white p-6 shadow-sm">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-[#0b1c30]">
                Leads por Mes ({currentYear})
              </h3>
              <p className="text-sm text-[#757684]">
                {totalLeadsYear} leads captados en el año •{" "}
                {qualifiedLeadsYear} calificados
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-3 bg-[#00288e]" />
                <span className="text-xs font-semibold">Leads captados</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-3 border-t-2 border-dashed border-[#006a61]" />
                <span className="text-xs font-semibold">Calificados</span>
              </div>
            </div>
          </div>
          <div className="relative h-64 w-full overflow-hidden">
            {totalLeadsYear === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#757684]">
                {loading
                  ? "Cargando datos..."
                  : "Aún no hay leads registrados este año."}
              </div>
            ) : (
              <svg
                className="h-full w-full"
                preserveAspectRatio="none"
                viewBox="0 0 1000 200"
              >
                <defs>
                  <linearGradient
                    id="chartGradient"
                    x1="0%"
                    x2="0%"
                    y1="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#1e40af" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={chartPaths.line}
                  fill="transparent"
                  stroke="#00288e"
                  strokeWidth="3"
                />
                <path d={chartPaths.area} fill="url(#chartGradient)" />
                <path
                  d={chartPaths.qualifiedLine}
                  fill="transparent"
                  stroke="#006a61"
                  strokeDasharray="6,6"
                  strokeWidth="2"
                />
              </svg>
            )}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between border-t border-[#c4c5d5] px-2 pt-4 text-[10px] font-bold text-[#757684]">
              {months.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Desempeño del Equipo */}
        <div className="col-span-12 overflow-hidden rounded-xl border border-[#c4c5d5] bg-white shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#c4c5d5] p-6">
            <h3 className="text-xl font-semibold text-[#0b1c30]">
              Desempeño del Equipo
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#eff4ff] text-[#757684]">
                  <th className="px-6 py-3 text-xs font-semibold">
                    Agente de Ventas
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold">
                    Negocios Ganados
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold">
                    Desempeño
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm text-[#0b1c30]">
                {teamPerformance.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-4 text-center text-sm text-[#757684]"
                    >
                      {loading
                        ? "Cargando..."
                        : "Aún no hay negocios ganados registrados."}
                    </td>
                  </tr>
                )}
                {teamPerformance.map((agent, i) => {
                  const avatar = avatarFor(agent.name);
                  return (
                    <tr
                      key={agent.name}
                      className={i % 2 === 1 ? "bg-[#f8f9ff]" : ""}
                    >
                      <td className="flex items-center gap-3 px-6 py-4">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${avatar.bg} ${avatar.text}`}
                        >
                          {initials(agent.name)}
                        </div>
                        <span>{agent.name}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold">
                        {agent.deals}
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#c4c5d5]">
                          <div
                            className="h-full bg-[#00288e]"
                            style={{ width: `${agent.performance}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historial de Negocios */}
        <div className="col-span-12 rounded-xl border border-[#c4c5d5] bg-white p-6 shadow-sm lg:col-span-5">
          <h3 className="mb-6 text-xl font-semibold text-[#0b1c30]">
            Historial Reciente de Negocios
          </h3>
          <div className="space-y-6">
            {dealHistory.length === 0 && (
              <p className="text-sm text-[#757684]">
                {loading
                  ? "Cargando..."
                  : "Aún no hay negocios cerrados."}
              </p>
            )}
            {dealHistory.map((deal, i) => {
              const won = deal.status === "ganado";
              return (
                <div
                  key={deal.id}
                  className={`flex items-start gap-4 ${
                    i < dealHistory.length - 1
                      ? "border-b border-[#c4c5d5] pb-4"
                      : ""
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      won
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    <span className="material-symbols-outlined">
                      {won ? "check_circle" : "cancel"}
                    </span>
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm font-semibold text-[#0b1c30]">
                      {deal.title}
                    </p>
                    <p className="text-sm text-[#757684]">
                      {deal.owner
                        ? `Cerrado por ${deal.owner.full_name}`
                        : "Sin agente"}{" "}
                      • {relativeTime(deal.closed_at!)}
                    </p>
                    <span
                      className={`mt-2 inline-block rounded border px-2 py-0.5 text-[10px] font-bold ${
                        won
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      {won ? "GANADO" : "PERDIDO"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
