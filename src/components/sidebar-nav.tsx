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

  // Agrupar por sección conservando el orden de la guía
  const sections: { name: string; items: typeof visibleItems }[] = [];
  for (const item of visibleItems) {
    const last = sections[sections.length - 1];
    if (last && last.name === item.section) {
      last.items.push(item);
    } else {
      sections.push({ name: item.section, items: [item] });
    }
  }

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-[#0b1c30] px-4 py-6 text-[#dde1ff]">
      <div className="mb-8 flex items-center gap-3 px-2">
        <Image
          src="/logo.png"
          alt="Proyecta Innova"
          width={40}
          height={40}
          className="h-10 w-10 rounded-lg bg-white/90 object-contain p-0.5"
          priority
        />
        <div>
          <h1 className="text-base font-bold leading-none text-white">
            Proyecta Innova
          </h1>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#8fa0c9]">
            CRM · Terrenos
          </p>
        </div>
      </div>

      <nav className="flex-grow space-y-1 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.name}>
            <p className="px-3 pb-1 pt-4 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#6a7ba3]">
              {section.name}
            </p>
            {section.items.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors duration-150 ${
                    isActive
                      ? "bg-[#00288e] text-white"
                      : "text-[#b9c4e2] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isActive ? "bg-white" : "bg-current opacity-50"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {currentUser && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00288e] text-sm font-bold text-white">
              {currentUser.full_name
                .split(" ")
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">
                {currentUser.full_name}
              </span>
              <span className="text-[10px] font-semibold text-[#8fa0c9]">
                {roleLabels[currentUser.role]}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
