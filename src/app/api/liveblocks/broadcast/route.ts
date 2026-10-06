import { Liveblocks } from "@liveblocks/node";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { getRoomAccess } from "@/lib/room-access";
import { logSecurityEvent } from "@/lib/security-log";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    await logSecurityEvent({
      event: "liveblocks_broadcast_denied",
      route: "/api/liveblocks/broadcast",
      reason: "unauthorized",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId, type, userId, userName, bookingId } = await req.json();
  if (typeof roomId !== "string" || roomId.length === 0) {
    return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
  }

  const access = await getRoomAccess(user.id, roomId);
  if (!access.allowed || !access.isHost) {
    await logSecurityEvent({
      event: "liveblocks_broadcast_denied",
      route: "/api/liveblocks/broadcast",
      userId: user.id,
      targetId: roomId,
      reason: !access.allowed ? "forbidden_room_access" : "non_host_broadcast_attempt",
      metadata: { isHost: access.isHost, bookingStatus: access.bookingStatus },
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await liveblocks.broadcastEvent(roomId, { type, userId, userName, bookingId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to broadcast:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
