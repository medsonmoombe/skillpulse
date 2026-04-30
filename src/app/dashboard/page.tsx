import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { userTopics, articles, groupMemberships, rooms, users } from "@/db/schema";
import { eq, desc, or } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PenLine, Users, Search, Clock, Zap, BookOpen, Star, ArrowRight, Radio, CalendarClock } from "lucide-react";
import Link from "next/link";
import { JoinRoomButton } from "@/components/JoinRoomButton";
import { EndSessionInlineButton } from "@/components/EndSessionInlineButton";
import { cleanupStaleRooms } from "@/app/actions/roomUtils";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  // Clean up expired scheduled rooms before rendering
  await cleanupStaleRooms();

  const [topicsData, articlesData, groupsData] = await Promise.all([
    db.select().from(userTopics).where(eq(userTopics.userId, user.id)),
    db.select().from(articles).where(eq(articles.authorId, user.id)),
    db.select().from(groupMemberships).where(eq(groupMemberships.userId, user.id)),
  ]);

  if (topicsData.length === 0) redirect("/onboarding");

  const firstName = user.displayName?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Fetch active rooms
  const activeRooms = await db
    .select({
      id: rooms.id,
      title: rooms.title,
      hostName: users.displayName,
      hostId: rooms.hostId,
      createdAt: rooms.createdAt,
    })
    .from(rooms)
    .leftJoin(users, eq(rooms.hostId, users.id))
    .where(eq(rooms.status, "active"))
    .orderBy(desc(rooms.createdAt))
    .limit(5);

  // Fetch upcoming scheduled rooms
  const scheduledRooms = await db
    .select({
      id: rooms.id,
      title: rooms.title,
      hostName: users.displayName,
      hostId: rooms.hostId,
      startsAt: rooms.startsAt,
    })
    .from(rooms)
    .leftJoin(users, eq(rooms.hostId, users.id))
    .where(eq(rooms.status, "scheduled"))
    .orderBy(rooms.startsAt)
    .limit(5);

  const stats = [
    { label: "Groups Joined", value: groupsData.length, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Articles Written", value: articlesData.length, icon: BookOpen, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Topics Following", value: topicsData.length, icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const actions = [
    { href: "/dashboard/articles/new", label: "Write Article", desc: "Share your knowledge", icon: PenLine, color: "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white" },
    { href: "/dashboard/groups", label: "Browse Groups", desc: "Find your community", icon: Users, color: "bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white" },
    { href: "/", label: "Explore Feed", desc: "Read expert articles", icon: Search, color: "bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white" },
    { href: "#", label: "Schedule", desc: "Book a session", icon: Clock, color: "bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white" },
  ];

  return (
    <div className="space-y-8 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{greeting},</p>
          <h1 className="text-3xl font-bold text-slate-900 mt-0.5">{firstName} 👋</h1>
          <p className="text-slate-500 text-sm mt-1">Here's what's happening on SkillPulse today.</p>
        </div>
        {user.role === "learner" && (
          <Button size="sm" className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 shadow-md shadow-indigo-500/20 gap-2 hover:opacity-90">
            <Zap size={14} /> Become Expert
          </Button>
        )}
      </div>

      {/* Role + Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg shadow-indigo-500/20 lg:col-span-1">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-9 w-9 rounded-xl object-cover" />
                ) : (
                  <span className="text-white font-bold text-sm">{user.displayName.charAt(0)}</span>
                )}
              </div>
              <Badge className="bg-white/20 text-white border-0 text-xs capitalize hover:bg-white/20">
                {user.role}
              </Badge>
            </div>
            <p className="font-bold text-base leading-tight truncate">{user.displayName}</p>
            <p className="text-indigo-200 text-xs mt-0.5 truncate">{user.email}</p>
          </CardContent>
        </Card>

        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-slate-200">
            <CardContent className="pt-5 pb-4">
              <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Happening Now */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold text-slate-900">Happening Now</h2>
          {activeRooms.length > 0 && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              {activeRooms.length} Live
            </span>
          )}
        </div>

        {activeRooms.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl py-8 text-center bg-white">
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Radio size={18} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No active sessions right now</p>
            <p className="text-xs text-slate-400 mt-1">Be the first to go live!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeRooms.map((room) => (
              <div key={room.id} className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-red-200 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <Radio size={16} className="text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{room.title}</p>
                    <p className="text-xs text-slate-500">Host: {room.hostName || "Unknown"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {room.hostId === user.id && <EndSessionInlineButton roomId={room.id} />}
                  <JoinRoomButton roomId={room.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Sessions */}
      {scheduledRooms.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-slate-900">Upcoming Sessions</h2>
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold">
              <CalendarClock size={11} />
              {scheduledRooms.length} Scheduled
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scheduledRooms.map((room) => (
              <div key={room.id} className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-indigo-200 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <CalendarClock size={16} className="text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{room.title}</p>
                    <p className="text-xs text-slate-500">
                      {room.startsAt
                        ? new Date(room.startsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                        : "Time TBD"} · Host: {room.hostName || "Unknown"}
                    </p>
                  </div>
                </div>
                <JoinRoomButton roomId={room.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {actions.map(({ href, label, desc, icon: Icon, color }) => (
            <Link
              key={label}
              href={href}
              className="group flex flex-col items-center text-center p-5 bg-white rounded-xl border-2 border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all duration-200"
            >
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-3 transition-colors duration-200 ${color}`}>
                <Icon size={22} />
              </div>
              <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent articles */}
      {articlesData.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Your Articles</h2>
            <Link href="/dashboard/articles/new" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              New <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {articlesData.slice(0, 3).map((article) => (
              <div key={article.id} className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-indigo-200 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <BookOpen size={14} className="text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{article.title}</p>
                    <p className="text-xs text-slate-400">{new Date(article.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <Badge variant={article.published ? "default" : "secondary"} className={`text-xs shrink-0 ml-3 ${article.published ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}`}>
                  {article.published ? "Published" : "Draft"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
