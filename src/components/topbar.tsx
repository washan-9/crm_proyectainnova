"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNewLead } from "@/components/new-lead-modal";

type Notification = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  action_url: string | null;
  read: boolean;
  created_at: string;
};

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Ahora mismo";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} día${days === 1 ? "" : "s"}`;
}

export function Topbar() {
  const router = useRouter();
  const { openModal } = useNewLead();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("notifications")
      .select("id, title, description, icon, action_url, read, created_at")
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => setNotifications((data ?? []) as Notification[]));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-16rem)] items-center justify-between border-b border-[#c4c5d5] bg-[#f8f9ff] px-8">
      <div className="flex flex-1 items-center">
        <div className="relative w-96 rounded-lg focus-within:ring-2 focus-within:ring-[#00288e]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#757684]">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar leads, negocios o contactos..."
            className="w-full rounded-lg border-none bg-[#eff4ff] py-2 pl-10 text-sm outline-none focus:ring-0"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div ref={bellRef} className="relative mr-4">
          <button
            onClick={() => setBellOpen((v) => !v)}
            className="relative rounded-full p-2 text-[#444653] transition-colors hover:text-[#00288e]"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ba1a1a] px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-12 w-96 overflow-hidden rounded-xl border border-[#c4c5d5] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#c4c5d5] bg-[#eff4ff] px-4 py-3">
                <h4 className="text-sm font-semibold text-[#0b1c30]">
                  Notificaciones
                </h4>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-[#00288e] px-2 py-0.5 text-[10px] font-bold text-white">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 && (
                  <p className="p-6 text-center text-sm text-[#757684]">
                    No tienes notificaciones.
                  </p>
                )}
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markRead(n.id)}
                    className={`flex items-start gap-3 border-b border-[#c4c5d5]/40 px-4 py-3 transition-colors last:border-b-0 hover:bg-[#eff4ff] ${
                      !n.read ? "cursor-pointer bg-[#eff4ff]/60" : ""
                    }`}
                  >
                    <span className="material-symbols-outlined mt-0.5 rounded-full bg-[#dde1ff] p-1.5 text-[18px] text-[#00288e]">
                      {n.icon ?? "notifications"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm text-[#0b1c30] ${
                            !n.read ? "font-semibold" : ""
                          }`}
                        >
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#00288e]" />
                        )}
                      </div>
                      {n.description && (
                        <p className="truncate text-xs text-[#757684]">
                          {n.description}
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-[#757684]">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/recordatorios"
                onClick={() => setBellOpen(false)}
                className="block border-t border-[#c4c5d5] bg-[#eff4ff] py-2.5 text-center text-xs font-semibold text-[#00288e] hover:underline"
              >
                Ver todos los recordatorios
              </Link>
            </div>
          )}
        </div>
        <button
          onClick={openModal}
          className="rounded-lg bg-[#00288e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
        >
          Nuevo Lead
        </button>
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="rounded-full p-2 text-[#444653] transition-colors hover:text-[#ba1a1a]"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>
    </header>
  );
}
