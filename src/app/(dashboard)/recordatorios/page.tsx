"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DbCategory = "leads" | "tareas" | "otros";
type CategoryFilter = "all" | "unread" | DbCategory;

type Notification = {
  id: string;
  category: DbCategory;
  title: string;
  description: string | null;
  icon: string | null;
  action_url: string | null;
  read: boolean;
  created_at: string;
};

const categoryIcons: Record<DbCategory, string> = {
  leads: "person_add",
  tareas: "alarm",
  otros: "notifications",
};

const categoryIconStyles: Record<DbCategory, string> = {
  leads: "bg-[#86f2e4] text-[#006f66]",
  tareas: "bg-[#1e40af]/10 text-[#00288e]",
  otros: "bg-[#e0e3e5] text-[#323537]",
};

const categoryList: { key: CategoryFilter; label: string; icon: string }[] = [
  { key: "all", label: "Todas las Notificaciones", icon: "list" },
  { key: "unread", label: "No Leídas", icon: "mark_email_unread" },
  { key: "leads", label: "Leads", icon: "person_add" },
  { key: "tareas", label: "Tareas", icon: "task_alt" },
];

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Hoy";
  if (date.toDateString() === yesterday.toDateString()) return "Ayer";
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeLabel(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Ahora mismo";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} hora${hours === 1 ? "" : "s"}`;
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecordatoriosPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [toast, setToast] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("notifications")
      .select(
        "id, category, title, description, icon, action_url, read, created_at",
      )
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setNotifications((data ?? []) as Notification[]);
        setLoading(false);
      });
  }, []);

  const counts = useMemo(
    () => ({
      all: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      leads: notifications.filter((n) => n.category === "leads").length,
      tareas: notifications.filter((n) => n.category === "tareas").length,
      otros: notifications.filter((n) => n.category === "otros").length,
    }),
    [notifications],
  );

  const filtered = notifications.filter((n) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "unread") return !n.read;
    return n.category === activeCategory;
  });

  const grouped: Record<string, Notification[]> = {};
  filtered.forEach((n) => {
    const day = dayLabel(n.created_at);
    grouped[day] = grouped[day] ?? [];
    grouped[day].push(n);
  });

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }

  const readPercent =
    notifications.length === 0
      ? 100
      : Math.round(
          ((notifications.length - counts.unread) / notifications.length) *
            100,
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
                    {counts[cat.key as keyof typeof counts]}
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
                  {readPercent}% al día (
                  {notifications.length - counts.unread} de{" "}
                  {notifications.length})
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feed de notificaciones */}
        <div className="col-span-12 lg:col-span-9">
          <div className="overflow-hidden rounded-xl border border-[#c4c5d5] bg-white shadow-sm">
            {loading && (
              <p className="p-6 text-center text-sm text-[#757684]">
                Cargando notificaciones...
              </p>
            )}
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
                    onClick={() => !n.read && markRead(n.id)}
                    className={`group relative flex items-start gap-6 border-b border-[#c4c5d5] p-6 transition-colors last:border-b-0 hover:bg-[#eff4ff] ${
                      !n.read
                        ? "cursor-pointer border-l-4 border-l-[#00288e] bg-[#eff4ff]/60"
                        : ""
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${categoryIconStyles[n.category]}`}
                    >
                      <span className="material-symbols-outlined">
                        {n.icon ?? categoryIcons[n.category]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-start justify-between">
                        <h4 className="text-lg font-semibold text-[#0b1c30]">
                          {n.title}
                        </h4>
                        <span className="whitespace-nowrap text-xs text-[#757684]">
                          {timeLabel(n.created_at)}
                        </span>
                      </div>
                      {n.description && (
                        <p className="text-sm text-[#757684]">
                          {n.description}
                        </p>
                      )}
                      {n.action_url && (
                        <div className="mt-4 flex gap-3">
                          <a
                            href={n.action_url}
                            className="rounded-lg bg-[#00288e] px-4 py-1.5 text-xs font-semibold text-white"
                          >
                            Ver detalle
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {!loading && filtered.length === 0 && (
              <p className="p-6 text-center text-sm text-[#757684]">
                {notifications.length === 0
                  ? "No tienes notificaciones todavía."
                  : "No hay notificaciones en esta categoría."}
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
