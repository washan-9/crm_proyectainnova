"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, type AppRole } from "@/lib/nav-items";
import { useCurrentUser } from "@/components/current-user-provider";

const roleLabels: Record<AppRole, string> = {
  administrador: "Administrador",
  teleoperador: "Teleoperador",
  vendedor: "Vendedor",
};

export function SidebarNav() {
  const pathname = usePathname();
  const { currentUser } = useCurrentUser();

  const visibleItems = currentUser
    ? navItems.filter((item) => item.roles.includes(currentUser.role))
    : [];

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-[#eff4ff] px-4 py-6">
      <div className="mb-10 flex items-center gap-3">
        <Image
          src="/logo.png"
          alt="Proyecta Innova"
          width={40}
          height={40}
          className="h-10 w-10 rounded-lg object-contain"
          priority
        />
        <div>
          <h1 className="text-lg font-bold leading-none text-[#00288e]">
            Proyecta Innova
          </h1>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#757684]">
            CRM Inmobiliario
          </p>
        </div>
      </div>

      <nav className="flex-grow space-y-2">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors duration-200 ${
                isActive
                  ? "border-r-4 border-[#00288e] bg-[#dce9ff] text-[#00288e]"
                  : "text-[#444653] hover:bg-[#dce9ff] hover:text-[#00288e]"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {currentUser && (
        <div className="mt-6 border-t border-[#c4c5d5]/30 pt-6">
          <div className="flex items-center gap-3 rounded-xl bg-[#e5eeff] px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#00288e] text-sm font-bold text-white">
              {currentUser.full_name
                .split(" ")
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#0b1c30]">
                {currentUser.full_name}
              </span>
              <span className="text-[10px] font-semibold text-[#757684]">
                {roleLabels[currentUser.role]}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
