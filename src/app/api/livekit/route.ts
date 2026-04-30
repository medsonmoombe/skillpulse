import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { getCurrentUser } from "@/lib/currentUser";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { rooms, roomBookings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { room: roomId } = await req.json();
  if (!roomId) return NextResponse.json({ error: "Room ID required" }, { status: 400 });

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error("LiveKit API keys are not set");

  // Fetch room
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const isHost = room.hostId === user.id;

  // Non-hosts must be admitted
  if (!isHost) {
    const [booking] = await db
      .select()
      .from(roomBookings)
      .where(and(eq(roomBookings.roomId, roomId), eq(roomBookings.userId, user.id)));

    if (!booking || booking.status !== "admitted") {
      return NextResponse.json({ error: "You are not admitted to this session yet." }, { status: 403 });
    }
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: user.displayName,
  });

  at.addGrant({
    roomJoin: true,
    room: room.livekitRoomId, // use the actual LiveKit room ID
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  return NextResponse.json({ token });
}
