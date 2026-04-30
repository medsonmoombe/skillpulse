"use server";

import { db } from "@/db";
import { rooms, roomBookings } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Liveblocks } from "@liveblocks/node";

const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY as string });

export async function knockOnDoor(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const roomId = formData.get("roomId") as string;
  if (!roomId) throw new Error("Room ID required");

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) throw new Error("Room not found");

  const [bookingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roomBookings)
    .where(eq(roomBookings.roomId, roomId));

  if (bookingCount.count >= 25) throw new Error("This session is full.");

  let newBookingId: string | null = null;

  try {
    const initialStatus = room.autoAdmit ? "admitted" : "booked";
    const [newBooking] = await db
      .insert(roomBookings)
      .values({ roomId, userId: user.id, status: initialStatus })
      .returning();
    newBookingId = newBooking.id;

    // Broadcast KNOCK event so host sees it instantly via Liveblocks
    if (initialStatus === "booked") {
      await liveblocks.broadcastEvent(roomId, {
        type: "KNOCK",
        userId: user.id,
        userName: user.displayName,
        bookingId: newBooking.id,
      });
    }
  } catch (error: any) {
    if (error.code !== "23505") throw error;
  }

  revalidatePath(`/dashboard/room/${roomId}`);
}
