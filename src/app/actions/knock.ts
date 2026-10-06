"use server";

import { db } from "@/db";
import { rooms } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Liveblocks } from "@liveblocks/node";
import { reserveRoomSpotTransactional } from "@/lib/room-booking";

const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY as string });

export async function knockOnDoor(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const roomId = formData.get("roomId") as string;
  if (!roomId) throw new Error("Room ID required");

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) throw new Error("Room not found");

  const reservation = await reserveRoomSpotTransactional({
    roomId,
    userId: user.id,
    allowedStatuses: ["active"],
  });

  if (reservation.created && reservation.bookingStatus === "booked") {
    await liveblocks.broadcastEvent(roomId, {
      type: "KNOCK",
      userId: user.id,
      userName: user.displayName,
      bookingId: reservation.bookingId,
    });
  }

  revalidatePath(`/dashboard/room/${roomId}`);
}
