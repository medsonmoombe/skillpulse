import { Liveblocks } from "@liveblocks/node";
import { NextResponse } from "next/server";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST(req: Request) {
  const { roomId, type, userId, userName, bookingId } = await req.json();

  try {
    await liveblocks.broadcastEvent(roomId, { type, userId, userName, bookingId });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to broadcast:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
