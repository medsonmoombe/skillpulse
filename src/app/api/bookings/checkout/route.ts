import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/currentUser";
import { ensureDemoWalletForUser, getWalletSnapshot } from "@/lib/demo-wallet";
import { reserveRoomSpotTransactional } from "@/lib/room-booking";
import { NotificationService } from "@/services/notificationService";

const checkoutSchema = z.object({
  roomId: z.string().uuid(),
  paymentMethod: z.enum(["bonus_credits", "airtel_money", "mtn_money", "zamtel_money", "zed_mobile"]).default("bonus_credits"),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = checkoutSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { roomId, paymentMethod } = parsed.data;
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.hostId === user.id) return NextResponse.json({ error: "You cannot book your own session" }, { status: 400 });
  if (room.status !== "scheduled") return NextResponse.json({ error: "Room is not available for booking" }, { status: 400 });

  await Promise.all([
    ensureDemoWalletForUser(user.id),
    ensureDemoWalletForUser(room.hostId),
  ]);

  try {
    const reservation = await reserveRoomSpotTransactional({
      roomId,
      userId: user.id,
      allowedStatuses: ["scheduled"],
      paymentMethod,
      priceCredits: room.priceCredits ?? 0,
    });

    if (reservation.created) {
      await NotificationService.create({
        userId: room.hostId,
        title: "New Booking",
        message: `${user.displayName} reserved a spot in "${room.title}".`,
        type: "booking",
        entityType: "room",
        entityId: roomId,
        actionUrl: `/dashboard/room/${roomId}`,
      });
    }

    const wallet = await getWalletSnapshot(user.id);
    return NextResponse.json({
      reservation,
      room: {
        id: room.id,
        title: room.title,
        priceCredits: room.priceCredits,
      },
      wallet: wallet.wallet,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to complete checkout" }, { status: 400 });
  }
}
