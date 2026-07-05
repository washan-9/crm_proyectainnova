import { SidebarNav } from "@/components/sidebar-nav";
import { CurrentUserProvider } from "@/components/current-user-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CurrentUserProvider>
      <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
        <SidebarNav />
        <main className="ml-64 min-h-screen">{children}</main>
      </div>
    </CurrentUserProvider>
  );
}
