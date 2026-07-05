export type AppRole = "administrador" | "teleoperador" | "vendedor";

export type NavItem = {
  href: string;
  label: string;
  section: string;
  /** Roles que pueden ver esta pantalla (matriz de la guía definitiva) */
  roles: AppRole[];
};

// Matriz de accesos (docs/ROLES.md):
//   Teleoperador  → Captación, Calificación
//   Vendedor      → Prospectos, Reuniones, Seguimiento, Terrenos (consulta)
//   Administrador → acceso total a las 8 pantallas
export const navItems: NavItem[] = [
  {
    href: "/captacion",
    label: "Captación de Leads",
    section: "Embudo comercial",
    roles: ["teleoperador", "administrador"],
  },
  {
    href: "/calificacion",
    label: "Calificación de Leads",
    section: "Embudo comercial",
    roles: ["teleoperador", "administrador"],
  },
  {
    href: "/prospectos",
    label: "Gestión de Prospectos",
    section: "Embudo comercial",
    roles: ["vendedor", "administrador"],
  },
  {
    href: "/reuniones",
    label: "Gestión de Reuniones",
    section: "Continuidad comercial",
    roles: ["vendedor", "administrador"],
  },
  {
    href: "/seguimiento",
    label: "Seguimiento Comercial",
    section: "Continuidad comercial",
    roles: ["vendedor", "administrador"],
  },
  {
    href: "/admin",
    label: "Administración y Seguridad",
    section: "Gobernanza",
    roles: ["administrador"],
  },
  {
    href: "/terrenos",
    label: "Gestión de Terrenos",
    section: "Extensión MVP v2",
    roles: ["vendedor", "administrador"],
  },
  {
    href: "/reportes",
    label: "Reportes",
    section: "Extensión MVP v2",
    roles: ["administrador"],
  },
];

/** Primera pantalla de cada rol (destino de "/") */
export function homeFor(role: AppRole): string {
  if (role === "vendedor") return "/prospectos";
  return "/captacion";
}

/** ¿Puede este rol entrar a esta ruta? (proxy + guards) */
export function canAccess(pathname: string, role: AppRole | null): boolean {
  if (pathname === "/") return true; // redirige por rol en la página
  const item = navItems.find((i) => pathname.startsWith(i.href));
  if (!item) return true; // rutas fuera del menú no se restringen aquí
  if (!role) return false;
  return item.roles.includes(role);
}
