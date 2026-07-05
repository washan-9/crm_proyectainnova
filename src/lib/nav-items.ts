export type AppRole = "administrador" | "teleoperador" | "vendedor";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  /** Roles que pueden ver esta pestaña */
  roles: AppRole[];
};

// Matriz de accesos (ver docs/ROLES.md):
//   Inicio        → todos
//   Leads         → teleoperador
//   Contactos     → vendedor, administrador
//   Calendario    → vendedor, administrador
//   Recordatorios → vendedor
//   Usuarios      → administrador
export const navItems: NavItem[] = [
  {
    href: "/",
    label: "Inicio",
    icon: "dashboard",
    roles: ["administrador", "teleoperador", "vendedor"],
  },
  {
    href: "/leads",
    label: "Leads",
    icon: "person_search",
    roles: ["teleoperador"],
  },
  {
    href: "/contactos",
    label: "Contactos",
    icon: "contacts",
    roles: ["vendedor", "administrador"],
  },
  {
    href: "/calendario",
    label: "Calendario",
    icon: "calendar_month",
    roles: ["vendedor", "administrador"],
  },
  {
    href: "/recordatorios",
    label: "Recordatorios",
    icon: "notifications",
    roles: ["vendedor"],
  },
  {
    href: "/usuarios",
    label: "Empleados / Usuarios",
    icon: "group",
    roles: ["administrador"],
  },
];

/** ¿Puede este rol entrar a esta ruta? (para el proxy y los guards) */
export function canAccess(pathname: string, role: AppRole | null): boolean {
  const item = navItems.find((i) =>
    i.href === "/" ? pathname === "/" : pathname.startsWith(i.href),
  );
  // Rutas fuera del menú (ej. /ventas) no se restringen aquí
  if (!item) return true;
  if (!role) return false;
  return item.roles.includes(role);
}
