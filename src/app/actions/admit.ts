"use server";

import { db } from "@/db";
import { rooms, roomBookings } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Liveblocks } from "@liveblocks/node";
import { NotificationService } from "@/services/notification-service";

const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY as string });

export async function admitUser(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const bookingId = formData.get("bookingId") as string;
  const roomId = formData.get("roomId") as string;

  // Security: verify current user is the host
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room || room.hostId !== user.id) throw new Error("Only the host can admit users");

  await db
    .update(roomBookings)
    .set({ status: "admitted" })
    .where(eq(roomBookings.id, bookingId));

  // Broadcast ADMIT event so the user's Lobby updates instantly
  const admittedBooking = await db.select().from(roomBookings).where(eq(roomBookings.id, bookingId));
  if (admittedBooking[0]) {
    await liveblocks.broadcastEvent(roomId, {
      type: "ADMIT",
      userId: admittedBooking[0].userId,
    });
    await NotificationService.create({
      userId: admittedBooking[0].userId,
      title: "You've been admitted!",
      message: `You've been admitted to the session.`,
      type: "admit",
      entityType: "room",
      entityId: roomId,
      actionUrl: `/dashboard/room/${roomId}`,
    });
  }

  revalidatePath(`/dashboard/room/${roomId}`);
}

export async function admitAll(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const roomId = formData.get("roomId") as string;

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room || room.hostId !== user.id) throw new Error("Only the host can admit users");

  await db
    .update(roomBookings)
    .set({ status: "admitted" })
    .where(and(eq(roomBookings.roomId, roomId), eq(roomBookings.status, "booked")));

  revalidatePath(`/dashboard/room/${roomId}`);
}
