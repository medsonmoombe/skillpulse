import { db } from "@/db";
import { connections, rooms, users, roomBookings } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import { endLiveRoom } from "@/app/actions/room";
import { EndSessionButton } from "@/components/EndSessionButton";
import { LeaveRoomButton } from "@/components/LeaveRoomButton";
import { WaitingRoom } from "@/components/WaitingRoom";
import { ClosedRoom } from "@/components/ClosedRoom";
import { Lobby, AdmitPanel } from "@/components/LobbyRoom";
import { KnockScreen } from "@/components/KnockScreen";
import { RoomShell } from "@/components/RoomShell";
import { RoomDrawer } from "@/components/RoomDrawer";
import { ActiveRoom } from "@/components/ActiveRoom";
import Link from "next/link";
import { getGroupMembershipState } from "@/lib/group-governance";
import { getEffectiveRoomStatus } from "@/lib/room-status";
import { GroupRoomEntryCard } from "@/components/GroupRoomEntryCard";
import { BookOpen, Users, Clock, ArrowLeft } from "lucide-react";
import { LessonLiveTracker } from "@/components/lesson-live/LessonLiveTracker";

const SKILL_LEVEL_LABELS: Record<string, string> = {
  general: "General",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const SKILL_LEVEL_COLORS: Record<string, string> = {
  general: "bg-slate-100 text-slate-600",
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced: "bg-red-100 text-red-700",
};

interface RoomPageProps {
  params: Promise<{ id: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { id } = await params;

  const [room] = await db
    .select({
      id: rooms.id,
      title: rooms.title,
      livekitRoomId: rooms.livekitRoomId,
      hostName: users.displayName,
      hostId: rooms.hostId,
      groupId: rooms.groupId,
      status: rooms.status,
      sessionType: rooms.sessionType,
      maxParticipants: rooms.maxParticipants,
      startsAt: rooms.startsAt,
      endsAt: rooms.endsAt,
      agenda: rooms.agenda,
      skillLevel: rooms.skillLevel,
    })
    .from(rooms)
    .leftJoin(users, eq(rooms.hostId, users.id))
    .where(eq(rooms.id, id));

  if (!room) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/dashboard");

  const isHost = user.id === room.hostId;
  const effectiveStatus = getEffectiveRoomStatus(room.status, room.startsAt);

  if (!room.groupId && effectiveStatus === "active" && !isHost) {
    const [friendship] = await db
      .select({ id: connections.id })
      .from(connections)
      .where(and(
        eq(connections.status, "accepted"),
        or(
          and(eq(connections.requesterId, user.id), eq(connections.addresseeId, room.hostId)),
          and(eq(connections.requesterId, room.hostId), eq(connections.addresseeId, user.id))
        )
      ))
      .limit(1);
    if (!friendship) notFound();
  }

  const bookings = await db
    .select({ id: roomBookings.id, userId: roomBookings.userId, status: roomBookings.status, userName: users.displayName })
    .from(roomBookings)
    .leftJoin(users, eq(roomBookings.userId, users.id))
    .where(eq(roomBookings.roomId, room.id));

  if (room.groupId && !isHost) {
    const membership = await getGroupMembershipState(room.groupId, user.id);
    if (membership?.status !== "approved") redirect("/dashboard/groups");
  }

  const bookingCount = bookings.length;
  const myBooking = bookings.find((b) => b.userId === user.id);
  const hasBooked = !!myBooking;
  const userStatus = myBooking?.status;
  const isAdmitted = isHost || userStatus === "admitted";
  const admittedUsers = bookings.filter((b) => b.status === "admitted").map((b) => ({ id: b.userId, name: b.userName }));

  // ── Scheduled ──────────────────────────────────────────────────────────────
  if (effectiveStatus === "scheduled") {
    return (
      <div className="h-screen flex flex-col bg-slate-50">
        <nav className="shrink-0 h-14 border-b bg-white flex items-center px-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
        </nav>
        <WaitingRoom title={room.title} startsAt={room.startsAt} isHost={isHost} roomId={room.id}
          currentBookings={bookingCount} maxParticipants={room.maxParticipants ?? 25} hasBooked={hasBooked} />
      </div>
    );
  }

  // ── Ended / Expired ─────────────────────────────────────────────────────────
  if (effectiveStatus === "ended" || effectiveStatus === "expired") {
    return (
      <div className="h-screen flex flex-col bg-slate-50">
        <nav className="shrink-0 h-14 border-b bg-white flex items-center px-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
        </nav>
        <ClosedRoom title={room.title} status={effectiveStatus} />
      </div>
    );
  }

  // ── Group room entry ─────────────────────────────────────────────────────────
  if (room.groupId && !isHost && effectiveStatus === "active" && !myBooking) {
    if (bookings.length >= (room.maxParticipants ?? 25)) {
      return (
        <div className="h-screen flex flex-col bg-slate-50">
          <nav className="shrink-0 h-14 border-b bg-white flex items-center px-6">
            <Link href="/dashboard/groups" className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Groups
            </Link>
          </nav>
          <ClosedRoom title={room.title} status="full" />
        </div>
      );
    }
    return (
      <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
        <header className="shrink-0 h-14 border-b border-slate-800 flex items-center px-4 bg-slate-900">
          <Link href="/dashboard/groups" className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Groups
          </Link>
        </header>
        <GroupRoomEntryCard roomId={room.id} title={room.title} />
      </div>
    );
  }

  // ── Active room — lobby + full-screen drawer ─────────────────────────────────
  const skillLabel = SKILL_LEVEL_LABELS[room.skillLevel ?? "general"] ?? "General";
  const skillColor = SKILL_LEVEL_COLORS[room.skillLevel ?? "general"] ?? SKILL_LEVEL_COLORS.general;
  const agenda: string[] = room.agenda ?? [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Nav */}
      <nav className="shrink-0 h-14 border-b bg-white flex items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <div className="flex items-center gap-2 rounded-full bg-red-50 border border-red-200 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-xs font-bold text-red-600 uppercase tracking-widest">Live</span>
        </div>
      </nav>

      {/* Lobby */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">

          {/* Session card */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="h-2 bg-gradient-to-r from-red-400 via-rose-400 to-pink-400" />
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-slate-900 leading-tight">{room.title}</h1>
                  <p className="mt-1 text-sm text-slate-500">Host: {room.hostName ?? "Unknown"}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${skillColor}`}>
                  {skillLabel}
                </span>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {admittedUsers.length} in session
                </div>
                {agenda.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    {agenda.length} agenda item{agenda.length !== 1 ? "s" : ""}
                  </div>
                )}
                {room.startsAt && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(room.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </div>

              {/* Agenda */}
              {agenda.length > 0 && (
                <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Agenda</p>
                  {agenda.slice(0, 4).map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-bold text-indigo-600">{i + 1}</span>
                      <p className="text-sm text-slate-600">{item}</p>
                    </div>
                  ))}
                  {agenda.length > 4 && (
                    <p className="pl-6 text-xs text-slate-400">+{agenda.length - 4} more</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Open Session button — inside RoomShell so Liveblocks is ready */}
          <LessonLiveTracker
            roomId={room.id}
            sessionType={room.sessionType ?? "general_live"}
            sessionTitle={room.title}
            isHost={isHost}
            isAdmitted={isAdmitted}
          />
          <RoomShell roomId={room.id} title={room.title} agenda={agenda} skillLevel={room.skillLevel} isHost={isHost} endAt={room.endsAt}>
            <RoomDrawer title={room.title} hostName={room.hostName}>
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                {isAdmitted ? (
                  <>
                    <div className="flex-1 flex overflow-hidden min-h-0">
                      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                        <ActiveRoom
                          roomId={room.id}
                          livekitRoomId={room.livekitRoomId}
                          currentUserId={user.id}
                          currentUserName={user.displayName}
                          currentUserRole={user.role}
                          isHost={isHost}
                          admittedUsers={admittedUsers}
                        />
                      </div>
                      {isHost && <AdmitPanel roomId={room.id} bookings={bookings} />}
                    </div>
                    {/* End / Leave inside drawer */}
                    <div className="shrink-0 border-t border-slate-800 bg-slate-900 px-4 py-2 flex justify-end">
                      {isHost ? (
                        <form action={endLiveRoom}>
                          <input type="hidden" name="roomId" value={room.id} />
                          <EndSessionButton />
                        </form>
                      ) : (
                        <LeaveRoomButton />
                      )}
                    </div>
                  </>
                ) : userStatus === "booked" ? (
                  <Lobby roomId={room.id} hostName={room.hostName} userId={user.id} />
                ) : (
                  <KnockScreen roomId={room.id} title={room.title} />
                )}
              </div>
            </RoomDrawer>
          </RoomShell>
        </div>
      </div>
    </div>
  );
}
