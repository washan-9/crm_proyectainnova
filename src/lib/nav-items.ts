export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Inicio", icon: "dashboard" },
  { href: "/leads", label: "Leads", icon: "person_search" },
  { href: "/contactos", label: "Contactos", icon: "contacts" },
  { href: "/calendario", label: "Calendario", icon: "calendar_month" },
  { href: "/recordatorios", label: "Recordatorios", icon: "notifications" },
  { href: "/usuarios", label: "Empleados / Usuarios", icon: "group" },
];
