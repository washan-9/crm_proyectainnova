export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Inicio", icon: "dashboard" },
  { href: "/leads", label: "Leads", icon: "person_search" },
  { href: "/contactos", label: "Contactos", icon: "contacts" },
  { href: "/reuniones", label: "Reuniones", icon: "event_available" },
  { href: "/calendario", label: "Calendario", icon: "calendar_month" },
  { href: "/recordatorios", label: "Recordatorios", icon: "notifications" },
  { href: "/usuarios", label: "Empleados / Usuarios", icon: "group" },
  { href: "/reportes", label: "Reportes", icon: "bar_chart" },
  { href: "/historial", label: "Historial", icon: "history" },
  { href: "/ventas", label: "Alertas / Ventas", icon: "payments" },
];
