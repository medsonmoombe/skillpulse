import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { MobileDashboardNav } from "@/components/MobileDashboardNav";
import { NotificationBell } from "@/components/NotificationBell";
import { Search } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { and, eq, gte, count as drizzleCount } from "drizzle-orm";

const LEARNER_DAILY_LIVE_LIMIT = 3;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  let learnerLivesUsedToday = 0;
  if (user.role === "learner") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [{ value }] = await db
      .select({ value: drizzleCount() })
      .from(rooms)
      .where(and(eq(rooms.hostId, user.id), gte(rooms.createdAt, startOfDay)));
    learnerLivesUsedToday = value;
  }

  const goLiveDisabled = user.role === "learner" && learnerLivesUsedToday >= LEARNER_DAILY_LIVE_LIMIT;

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">

      {/* Persistent Sidebar */}
      <DashboardSidebar user={user} goLiveDisabled={goLiveDisabled} />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-16 shrink-0 border-b bg-white flex items-center justify-between px-4 md:px-6 gap-3">
          <div className="md:hidden">
            <span className="text-lg font-extrabold bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text">
              SkillPulse
            </span>
          </div>
          {/* Search — full width on mobile, fixed on desktop */}
          <div className="relative flex-1 md:flex-none md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search SkillPulse..."
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <NotificationBell />
            <Link
              href={`/profile/${user.id}`}
              title="View my profile"
              className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm hover:opacity-80 transition-opacity"
            >
              {user.displayName?.charAt(0).toUpperCase() || "U"}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>

      <MobileDashboardNav user={user} goLiveDisabled={goLiveDisabled} />
    </div>
  );
}
