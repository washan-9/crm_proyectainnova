"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ViewTopbar({
  breadcrumb,
  title,
  actions,
}: {
  breadcrumb: string;
  title: string;
  actions?: React.ReactNode;
}) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#c4c5d5] bg-[#f8f9ff] px-8 py-4">
      <div>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[#00288e]">
          {breadcrumb}
        </p>
        <h1 className="text-2xl font-semibold text-[#0b1c30]">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#c4c5d5] bg-white text-[#444653] transition-colors hover:text-[#ba1a1a]"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </header>
  );
}
