"use server";

import { db } from "@/db";
import { rooms, roomBookings } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NotificationService } from "@/services/notification-service";

export async function bookRoom(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const roomId = formData.get("roomId") as string;
  if (!roomId) throw new Error("Room ID required");

  // 1. Check current capacity
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  
  if (!room) throw new Error("Room not found");
  if (room.status !== "scheduled") throw new Error("Room is not available for booking");

  // Count current bookings
  const [bookingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roomBookings)
    .where(eq(roomBookings.roomId, roomId));

  // 2. ENFORCE CAPACITY LOCK
  if (bookingCount.count >= 25) {
    throw new Error("This session is full.");
  }

  // 3. Insert Booking — auto-admit if room has autoAdmit enabled
  try {
    const initialStatus = room.autoAdmit ? "admitted" : "booked";
    await db.insert(roomBookings).values({
      roomId: roomId,
      userId: user.id,
      status: initialStatus,
    });
    // Notify the host someone booked
    await NotificationService.create({
      userId: room.hostId,
      title: "New Booking",
      message: `${user.displayName} reserved a spot in "${room.title}".`,
      type: "booking",
      entityId: roomId,
    });
  } catch (error: any) {
    // Ignore unique violation (user already booked)
    if (error.code === "23505") {
      console.log("User already booked this room.");
    } else {
      throw error;
    }
  }

  revalidatePath(`/dashboard/rooms/${roomId}`); // Refresh UI
}