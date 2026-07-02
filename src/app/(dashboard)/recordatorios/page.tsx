"use client";

import { useMemo, useState } from "react";

type Category = "all" | "unread" | "leads" | "tasks";

type Notification = {
  id: string;
  category: "leads" | "tasks" | "otros";
  day: "Hoy" | "Ayer";
  title: string;
  description: string;
  time: string;
  unread: boolean;
  icon: string;
  iconBg: string;
  iconText: string;
  actions?: { label: string; primary?: boolean }[];
};

const initialNotifications: Notification[] = [
  {
    id: "1",
    category: "leads",
    day: "Hoy",
    title: "Nuevo Lead Asignado: Elena Rodriguez",
    description:
      "Un nuevo lead de alta prioridad de 'TechGlobal Solutions' te fue asignado. Revisa los detalles y agenda una llamada de seguimiento.",
    time: "Hace 2 min",
    unread: true,
    icon: "person_add",
    iconBg: "bg-[#86f2e4]",
    iconText: "text-[#006f66]",
    actions: [{ label: "Ver Lead", primary: true }, { label: "Respuesta rápida" }],
  },
  {
    id: "2",
    category: "tasks",
    day: "Hoy",
    title: "Tarea Próxima: Revisión Trimestral",
    description:
      "Preparación para la reunión de revisión de desempeño Q3 que inicia a las 2:00 PM hoy. Asegúrate de subir todos los reportes.",
    time: "Hace 1 hora",
    unread: false,
    icon: "alarm",
    iconBg: "bg-[#1e40af]/10",
    iconText: "text-[#00288e]",
  },
  {
    id: "3",
    category: "otros",
    day: "Ayer",
    title: "Sarah Johnson te mencionó",
    description:
      '"@Carlos Mendoza ¿Puedes revisar la propuesta de presupuesto para el proyecto Innova? Adjunté el último borrador."',
    time: "Ayer, 4:45 PM",
    unread: false,
    icon: "alternate_email",
    iconBg: "bg-[#e0e3e5]",
    iconText: "text-[#323537]",
  },
  {
    id: "4",
    category: "otros",
    day: "Ayer",
    title: "Meta Alcanzada: Objetivo Mensual de Ventas",
    description:
      "¡Felicidades! Tu equipo superó el objetivo mensual de ventas de $1.2M. Tómate un momento para celebrar este logro.",
    time: "Ayer, 10:12 AM",
    unread: false,
    icon: "stars",
    iconBg: "bg-[#89f5e7]",
    iconText: "text-[#00201d]",
  },
];

const categoryList: { key: Category; label: string; icon: string }[] = [
  { key: "all", label: "Todas las Notificaciones", icon: "list" },
  { key: "unread", label: "No Leídas", icon: "mark_email_unread" },
  { key: "leads", label: "Leads", icon: "person_add" },
  { key: "tasks", label: "Tareas", icon: "task_alt" },
];

export default function RecordatoriosPage() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [toast, setToast] = useState(false);

  const counts = useMemo(
    () => ({
      all: notifications.length,
      unread: notifications.filter((n) => n.unread).length,
      leads: notifications.filter((n) => n.category === "leads").length,
      tasks: notifications.filter((n) => n.category === "tasks").length,
    }),
    [notifications],
  );

  const filtered = notifications.filter((n) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "unread") return n.unread;
    return n.category === activeCategory;
  });

  const grouped: Record<string, Notification[]> = {};
  filtered.forEach((n) => {
    grouped[n.day] = grouped[n.day] ?? [];
    grouped[n.day].push(n);
  });

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  const readPercent = Math.round(
    ((notifications.length - counts.unread) / notifications.length) * 100,
  );

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <nav className="mb-2 flex items-center gap-1 text-[#757684]">
            <span className="text-xs">Inicio</span>
            <span className="material-symbols-outlined text-[16px]">
              chevron_right
            </span>
            <span className="text-xs font-semibold text-[#00288e]">
              Recordatorios
            </span>
          </nav>
          <h2 className="text-4xl font-bold tracking-tight text-[#0b1c30]">
            Centro de Recordatorios
          </h2>
          <p className="mt-1 text-base text-[#757684]">
            Mantente al día con tus leads, tareas y actividades.
          </p>
        </div>
        <button
          onClick={markAllRead}
          className="flex items-center gap-2 rounded-lg border border-[#c4c5d5] px-6 py-2 text-sm font-semibold text-[#00288e] transition-colors hover:bg-[#eff4ff]"
        >
          <span className="material-symbols-outlined text-[20px]">
            done_all
          </span>
          Marcar todas como leídas
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Categorías */}
        <div className="col-span-12 lg:col-span-3">
          <div className="sticky top-24 rounded-xl border border-[#c4c5d5] bg-white p-6">
            <h3 className="mb-6 text-sm font-semibold text-[#0b1c30]">
              Categorías
            </h3>
            <div className="space-y-1">
              {categoryList.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex w-full items-center justify-between rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    activeCategory === cat.key
                      ? "bg-[#00288e] text-white"
                      : "text-[#444653] hover:bg-[#eff4ff]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined">
                      {cat.icon}
                    </span>
                    <span>{cat.label}</span>
                  </div>
                  <span
                    className={`rounded px-1.5 text-xs ${
                      activeCategory === cat.key
                        ? "bg-white/20"
                        : "bg-[#dce9ff]"
                    }`}
                  >
                    {counts[cat.key]}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-16 border-t border-[#c4c5d5] pt-6">
              <div className="rounded-xl bg-[#1e40af]/10 p-6">
                <p className="mb-2 text-xs font-semibold text-[#00288e]">
                  Notificaciones leídas
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#d3e4fe]">
                  <div
                    className="h-full bg-[#00288e]"
                    style={{ width: `${readPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[#757684]">
                  {readPercent}% al día ({notifications.length - counts.unread}{" "}
                  de {notifications.length})
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feed de notificaciones */}
        <div className="col-span-12 lg:col-span-9">
          <div className="overflow-hidden rounded-xl border border-[#c4c5d5] bg-white shadow-sm">
            {Object.entries(grouped).map(([day, items]) => (
              <div key={day}>
                <div className="border-b border-[#c4c5d5] bg-[#eff4ff] px-6 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#757684]">
                    {day}
                  </span>
                </div>
                {items.map((n) => (
                  <div
                    key={n.id}
                    className={`group relative flex items-start gap-6 border-b border-[#c4c5d5] p-6 transition-colors last:border-b-0 hover:bg-[#eff4ff] ${
                      n.unread ? "border-l-4 border-l-[#00288e] bg-[#eff4ff]/60" : ""
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${n.iconBg} ${n.iconText}`}
                    >
                      <span className="material-symbols-outlined">
                        {n.icon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-start justify-between">
                        <h4 className="text-lg font-semibold text-[#0b1c30]">
                          {n.title}
                        </h4>
                        <span className="whitespace-nowrap text-xs text-[#757684]">
                          {n.time}
                        </span>
                      </div>
                      <p className="text-sm text-[#757684]">
                        {n.description}
                      </p>
                      {n.actions && (
                        <div className="mt-4 flex gap-3">
                          {n.actions.map((action) => (
                            <button
                              key={action.label}
                              className={
                                action.primary
                                  ? "rounded-lg bg-[#00288e] px-4 py-1.5 text-xs font-semibold text-white"
                                  : "rounded-lg border border-[#c4c5d5] px-4 py-1.5 text-xs font-semibold text-[#0b1c30]"
                              }
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="p-6 text-center text-sm text-[#757684]">
                No hay notificaciones en esta categoría.
              </p>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-8 right-8 z-[100] flex items-center gap-3 rounded-lg bg-[#213145] px-6 py-4 text-sm text-white shadow-lg">
          <span className="material-symbols-outlined text-[#6bd8cb]">
            check_circle
          </span>
          Todas las notificaciones se marcaron como leídas
        </div>
      )}
    </>
  );
}
