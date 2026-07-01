import { SidebarNav } from "@/components/sidebar-nav";
import { Topbar } from "@/components/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
      <SidebarNav />
      <Topbar />
      <main className="ml-64 mt-16 min-h-screen p-8">{children}</main>
    </div>
  );
}
