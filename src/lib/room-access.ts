import { db } from "@/db";
import { connections, roomBookings, rooms } from "@/db/schema";
import { getGroupMembershipState } from "@/lib/group-governance";
import { and, eq, or } from "drizzle-orm";

type RoomAccessResult = {
  allowed: boolean;
  isHost: boolean;
  bookingStatus: string | null;
  roomExists: boolean;
};

export async function getRoomAccess(userId: string, roomId: string): Promise<RoomAccessResult> {
  const [room] = await db
    .select({
      id: rooms.id,
      hostId: rooms.hostId,
      groupId: rooms.groupId,
    })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);

  if (!room) {
    return {
      allowed: false,
      isHost: false,
      bookingStatus: null,
      roomExists: false,
    };
  }

  if (room.hostId === userId) {
    return {
      allowed: true,
      isHost: true,
      bookingStatus: null,
      roomExists: true,
    };
  }

  const [booking] = await db
    .select({
      status: roomBookings.status,
    })
    .from(roomBookings)
    .where(and(eq(roomBookings.roomId, roomId), eq(roomBookings.userId, userId)))
    .limit(1);

  if (room.groupId) {
    const membership = await getGroupMembershipState(room.groupId, userId);
    return {
      allowed: membership?.status === "approved",
      isHost: false,
      bookingStatus: booking?.status ?? null,
      roomExists: true,
    };
  }

  const [friendship] = await db
    .select({ id: connections.id })
    .from(connections)
    .where(
      and(
        eq(connections.status, "accepted"),
        or(
          and(eq(connections.requesterId, userId), eq(connections.addresseeId, room.hostId)),
          and(eq(connections.requesterId, room.hostId), eq(connections.addresseeId, userId))
        )
      )
    )
    .limit(1);

  return {
    allowed: Boolean(friendship) || Boolean(booking),
    isHost: false,
    bookingStatus: booking?.status ?? null,
    roomExists: true,
  };
}
