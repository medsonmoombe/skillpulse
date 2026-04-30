// src/app/dashboard/layout.tsx
import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { Search } from "lucide-react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">

      {/* Persistent Sidebar */}
      <DashboardSidebar user={user} />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-16 shrink-0 border-b bg-white flex items-center justify-between px-6 gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search SkillPulse..."
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {user.displayName?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
