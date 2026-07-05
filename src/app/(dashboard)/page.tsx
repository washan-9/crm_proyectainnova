"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNewLead } from "@/components/new-lead-modal";

export default function DashboardHomePage() {
  const [activeLeads, setActiveLeads] = useState<number | null>(null);
  const [meetingsToday, setMeetingsToday] = useState<number | null>(null);
  const { version } = useNewLead();

  useEffect(() => {
    const supabase = createClient();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    async function load() {
      const [leadsRes, eventsRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .neq("status", "perdido"),
        supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .gte("starts_at", startOfDay.toISOString())
          .lt("starts_at", endOfDay.toISOString()),
      ]);

      setActiveLeads(leadsRes.count ?? 0);
      setMeetingsToday(eventsRes.count ?? 0);
    }

    load();
  }, [version]);

  const metrics = [
    {
      label: "Leads Activos",
      value: activeLeads,
      icon: "person_add",
      iconBg: "bg-[#006a61]/10 text-[#006a61]",
    },
    {
      label: "Reuniones Hoy",
      value: meetingsToday,
      icon: "event_available",
      iconBg: "bg-[#e0e3e5] text-[#323537]",
    },
  ];

  return (
    <>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-[#0b1c30]">
            Desempeño de Ventas
          </h2>
          <p className="text-base text-[#757684]">
            Resumen de tu pipeline actual y la eficiencia del equipo.
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-[#c4c5d5] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-4 flex items-start justify-between">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${metric.iconBg}`}
              >
                <span className="material-symbols-outlined">
                  {metric.icon}
                </span>
              </div>
            </div>
            <p className="text-sm font-semibold text-[#757684]">
              {metric.label}
            </p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-[#0b1c30]">
              {metric.value ?? "…"}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
