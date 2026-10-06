"use server";

import { db } from "@/db";
import { rooms, roomBookings } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Liveblocks } from "@liveblocks/node";
import { NotificationService } from "@/services/notificationService";

const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY as string });

export async function admitUser(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const bookingId = formData.get("bookingId") as string;
  const roomId = formData.get("roomId") as string;
  if (!bookingId || !roomId) throw new Error("Room ID and booking ID are required");

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room || room.hostId !== user.id) throw new Error("Only the host can admit users");

  const [admittedBooking] = await db
    .update(roomBookings)
    .set({ status: "admitted" })
    .where(and(eq(roomBookings.id, bookingId), eq(roomBookings.roomId, roomId)))
    .returning({
      userId: roomBookings.userId,
      status: roomBookings.status,
    });

  if (admittedBooking?.status === "admitted") {
    await liveblocks.broadcastEvent(roomId, {
      type: "ADMIT",
      userId: admittedBooking.userId,
    });
    await NotificationService.create({
      userId: admittedBooking.userId,
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
  if (!roomId) throw new Error("Room ID is required");

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room || room.hostId !== user.id) throw new Error("Only the host can admit users");

  const admittedBookings = await db
    .update(roomBookings)
    .set({ status: "admitted" })
    .where(and(eq(roomBookings.roomId, roomId), eq(roomBookings.status, "booked")))
    .returning({
      userId: roomBookings.userId,
    });

  await Promise.all(
    admittedBookings.map(async (booking) => {
      await liveblocks.broadcastEvent(roomId, {
        type: "ADMIT",
        userId: booking.userId,
      });
      await NotificationService.create({
        userId: booking.userId,
        title: "You've been admitted!",
        message: `You've been admitted to the session.`,
        type: "admit",
        entityType: "room",
        entityId: roomId,
        actionUrl: `/dashboard/room/${roomId}`,
      });
    })
  );

  revalidatePath(`/dashboard/room/${roomId}`);
}
