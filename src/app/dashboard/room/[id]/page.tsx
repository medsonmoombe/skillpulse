import { db } from "@/db";
import { connections, rooms, users, roomBookings } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import { endLiveRoom } from "@/app/actions/room";
import { cleanupStaleRooms } from "@/app/actions/roomUtils";
import { EndSessionButton } from "@/components/EndSessionButton";
import { LeaveRoomButton } from "@/components/LeaveRoomButton";
import { WaitingRoom } from "@/components/WaitingRoom";
import { ClosedRoom } from "@/components/ClosedRoom";
import { Lobby, AdmitPanel } from "@/components/LobbyRoom";
import { KnockScreen } from "@/components/KnockScreen";
import { RoomShell } from "@/components/RoomShell";
import { ActiveRoom } from "@/components/ActiveRoom";
import Link from "next/link";
import { getGroupMembershipState } from "@/lib/group-governance";

interface RoomPageProps {
  params: Promise<{ id: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { id } = await params;

  await cleanupStaleRooms();

  const [room] = await db
    .select({
      id: rooms.id,
      title: rooms.title,
      livekitRoomId: rooms.livekitRoomId,
      hostName: users.displayName,
      hostId: rooms.hostId,
      groupId: rooms.groupId,
      status: rooms.status,
      maxParticipants: rooms.maxParticipants,
      startsAt: rooms.startsAt,
    })
    .from(rooms)
    .leftJoin(users, eq(rooms.hostId, users.id))
    .where(eq(rooms.id, id));

  if (!room) notFound();

  const user = await getCurrentUser();
  if (!user) {
    redirect("/dashboard");
  }

  const isHost = user?.id === room.hostId;

  if (!room.groupId && room.status === "active" && !isHost) {
    const [friendship] = await db
      .select({ id: connections.id })
      .from(connections)
      .where(
        and(
          eq(connections.status, "accepted"),
          or(
            and(eq(connections.requesterId, user.id), eq(connections.addresseeId, room.hostId)),
            and(eq(connections.requesterId, room.hostId), eq(connections.addresseeId, user.id))
          )
        )
      )
      .limit(1);

    if (!friendship) {
      notFound();
    }
  }

  let bookings = await db
    .select({
      id: roomBookings.id,
      userId: roomBookings.userId,
      status: roomBookings.status,
      userName: users.displayName,
    })
    .from(roomBookings)
    .leftJoin(users, eq(roomBookings.userId, users.id))
    .where(eq(roomBookings.roomId, room.id));

  if (room.groupId && !isHost) {
    const membership = await getGroupMembershipState(room.groupId, user.id);
    if (membership?.status !== "approved") {
      redirect("/dashboard/groups");
    }

    const existingBooking = bookings.find((booking) => booking.userId === user.id);
    if (!existingBooking) {
      const maxParticipants = room.maxParticipants ?? 25;
      if (bookings.length >= maxParticipants) {
        return (
          <div className="h-screen flex flex-col bg-slate-50">
            <nav className="shrink-0 h-14 border-b bg-white flex items-center px-6">
              <Link href="/dashboard/groups" className="px-4 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-lg transition-colors">
                Back to Groups
              </Link>
            </nav>
            <ClosedRoom title={room.title} status="full" />
          </div>
        );
      }

      await db.insert(roomBookings).values({
        roomId: room.id,
        userId: user.id,
        status: room.status === "active" ? "admitted" : "booked",
      });

      bookings = await db
        .select({
          id: roomBookings.id,
          userId: roomBookings.userId,
          status: roomBookings.status,
          userName: users.displayName,
        })
        .from(roomBookings)
        .leftJoin(users, eq(roomBookings.userId, users.id))
        .where(eq(roomBookings.roomId, room.id));
    }
  }

  const bookingCount = bookings.length;
  const myBooking = bookings.find((b) => b.userId === user?.id);
  const hasBooked = !!myBooking;
  const userStatus = myBooking?.status;
  const isAdmitted = isHost || userStatus === "admitted";

  const admittedUsers = bookings
    .filter((b) => b.status === "admitted")
    .map((b) => ({ id: b.userId, name: b.userName }));

  // Gate: Scheduled
  if (room.status === "scheduled") {
    return (
      <div className="h-screen flex flex-col bg-slate-50">
        <nav className="shrink-0 h-14 border-b bg-white flex items-center px-6">
          <Link href="/dashboard" className="px-4 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-lg transition-colors">
            Back to Dashboard
          </Link>
        </nav>
        <WaitingRoom
          title={room.title}
          startsAt={room.startsAt}
          isHost={isHost}
          roomId={room.id}
          currentBookings={bookingCount}
          maxParticipants={room.maxParticipants ?? 25}
          hasBooked={hasBooked}
        />
      </div>
    );
  }

  // Gate: Ended / Expired
  if (room.status === "ended" || room.status === "expired") {
    return (
      <div className="h-screen flex flex-col bg-slate-50">
        <nav className="shrink-0 h-14 border-b bg-white flex items-center px-6">
          <Link href="/dashboard" className="px-4 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-lg transition-colors">
            Back to Dashboard
          </Link>
        </nav>
        <ClosedRoom title={room.title} status={room.status} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      <link rel="stylesheet" href="/excalidraw.css" />

      <header className="shrink-0 h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Live</span>
          </div>
          <div className="h-4 w-px bg-slate-700 shrink-0" />
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-white leading-tight truncate">{room.title}</h2>
            <p className="text-[11px] text-slate-400 truncate">Host: {room.hostName || "Unknown"}</p>
          </div>
        </div>

        <div className="shrink-0 ml-3">
          {isHost ? (
            <form action={endLiveRoom}>
              <input type="hidden" name="roomId" value={room.id} />
              <EndSessionButton />
            </form>
          ) : (
            <LeaveRoomButton />
          )}
        </div>
      </header>

      <RoomShell roomId={room.id} title={room.title}>
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 relative overflow-hidden">
            {isAdmitted ? (
              <ActiveRoom
                roomId={room.id}
                livekitRoomId={room.livekitRoomId}
                currentUserId={user.id}
                currentUserName={user.displayName}
                currentUserRole={user.role}
                isHost={isHost}
                admittedUsers={admittedUsers}
              />
            ) : userStatus === "booked" ? (
              <Lobby roomId={room.id} hostName={room.hostName} userId={user.id} />
            ) : (
              <KnockScreen roomId={room.id} title={room.title} />
            )}
          </div>

          {isHost && (
            <AdmitPanel roomId={room.id} bookings={bookings} />
          )}
        </div>
      </RoomShell>
    </div>
  );
}
