"use server";

import { db } from "@/db";
import { rooms } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NotificationService } from "@/services/notificationService";
import { reserveRoomSpotTransactional } from "@/lib/room-booking";
import { ensureDemoWalletForUser } from "@/lib/demo-wallet";

export async function bookRoom(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const roomId = formData.get("roomId") as string;
  if (!roomId) throw new Error("Room ID required");

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) throw new Error("Room not found");
  if (room.status !== "scheduled") throw new Error("Room is not available for booking");

  await Promise.all([
    ensureDemoWalletForUser(user.id),
    ensureDemoWalletForUser(room.hostId),
  ]);

  const reservation = await reserveRoomSpotTransactional({
    roomId,
    userId: user.id,
    allowedStatuses: ["scheduled"],
    paymentMethod: "bonus_credits",
    priceCredits: room.priceCredits ?? 0,
  });

  if (reservation.created) {
    await NotificationService.create({
      userId: reservation.room.hostId,
      title: "New Booking",
      message: `${user.displayName} reserved a spot in "${reservation.room.title}".`,
      type: "booking",
      entityType: "room",
      entityId: roomId,
      actionUrl: `/dashboard/room/${roomId}`,
    });
  }

  revalidatePath(`/dashboard/room/${roomId}`);
}
