import { AccessToken } from "livekit-server-sdk";
import { getCurrentUser } from "@/lib/currentUser";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getRoomAccess } from "@/lib/room-access";
import { logSecurityEvent } from "@/lib/security-log";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    await logSecurityEvent({
      event: "livekit_token_denied",
      route: "/api/livekit",
      reason: "unauthorized",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { room: roomId } = await req.json();
  if (!roomId) return NextResponse.json({ error: "Room ID required" }, { status: 400 });

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error("LiveKit API keys are not set");

  // Fetch room
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const access = await getRoomAccess(user.id, roomId);
  if (!access.allowed) {
    await logSecurityEvent({
      event: "livekit_token_denied",
      route: "/api/livekit",
      userId: user.id,
      targetId: roomId,
      reason: "forbidden_room_access",
    });
    return NextResponse.json({ error: "You do not have access to this room." }, { status: 403 });
  }

  if (!access.isHost && access.bookingStatus !== "admitted") {
    await logSecurityEvent({
      event: "livekit_token_denied",
      route: "/api/livekit",
      userId: user.id,
      targetId: roomId,
      reason: "not_admitted",
      metadata: { bookingStatus: access.bookingStatus },
    });
    return NextResponse.json({ error: "You are not admitted to this session yet." }, { status: 403 });
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
