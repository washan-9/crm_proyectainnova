"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNewLead } from "@/components/new-lead-modal";

type Task = {
  id: string;
  title: string;
  tag: string | null;
  due_at: string | null;
  completed_at: string | null;
};

function formatDueDate(iso: string | null) {
  if (!iso) return "Sin fecha";
  const due = new Date(iso);
  const today = new Date();
  const sameDay = due.toDateString() === today.toDateString();
  const time = due.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) return `Hoy, ${time}`;
  return due.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

export default function DashboardHomePage() {
  const [activeLeads, setActiveLeads] = useState<number | null>(null);
  const [meetingsToday, setMeetingsToday] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { version } = useNewLead();

  useEffect(() => {
    const supabase = createClient();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    async function load() {
      const [leadsRes, eventsRes, tasksRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .neq("status", "perdido"),
        supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .gte("starts_at", startOfDay.toISOString())
          .lt("starts_at", endOfDay.toISOString()),
        supabase
          .from("tasks")
          .select("id, title, tag, due_at, completed_at")
          .order("due_at", { ascending: true, nullsFirst: false })
          .limit(8),
      ]);

      setActiveLeads(leadsRes.count ?? 0);
      setMeetingsToday(eventsRes.count ?? 0);
      setTasks(tasksRes.data ?? []);
      setLoading(false);
    }

    load();
  }, [version]);

  async function toggleTask(task: Task) {
    const completed_at = task.completed_at ? null : new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed_at } : t)),
    );
    const supabase = createClient();
    await supabase.from("tasks").update({ completed_at }).eq("id", task.id);
  }

  const pendingCount = tasks.filter((t) => !t.completed_at).length;
  const now = new Date();

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

      <section className="rounded-xl border border-[#c4c5d5] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#c4c5d5] px-6 py-4">
          <h3 className="text-xl font-semibold text-[#0b1c30]">
            Próximas Tareas
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#757684]">
              {pendingCount} pendientes
            </span>
          </div>
        </div>
        <div className="space-y-3 p-4">
          {loading && (
            <p className="p-4 text-sm text-[#757684]">Cargando tareas...</p>
          )}
          {!loading && tasks.length === 0 && (
            <p className="p-4 text-sm text-[#757684]">
              No hay tareas registradas.
            </p>
          )}
          {tasks.map((task) => {
            const done = task.completed_at !== null;
            const overdue =
              !done && task.due_at !== null && new Date(task.due_at) < now;
            return (
              <div
                key={task.id}
                className={`flex items-center gap-4 rounded-lg border border-transparent bg-[#f8f9ff] p-4 transition-shadow hover:border-[#c4c5d5]/30 hover:shadow-sm ${
                  done ? "opacity-60" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggleTask(task)}
                  className="h-5 w-5 rounded border-[#757684] text-[#00288e] focus:ring-[#00288e]"
                />
                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold text-[#0b1c30] ${
                      done ? "line-through" : ""
                    }`}
                  >
                    {task.title}
                  </p>
                  <div className="mt-1 flex items-center gap-4">
                    <span
                      className={`flex items-center gap-1 text-xs font-semibold ${
                        overdue ? "text-[#ba1a1a]" : "text-[#757684]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {done ? "check_circle" : "schedule"}
                      </span>
                      {done
                        ? "Completada"
                        : overdue
                          ? `Atrasada (${formatDueDate(task.due_at)})`
                          : formatDueDate(task.due_at)}
                    </span>
                    {task.tag && (
                      <span className="rounded bg-[#dde1ff] px-2 py-0.5 text-[10px] font-bold uppercase text-[#00288e]">
                        {task.tag}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </>
  );
}
