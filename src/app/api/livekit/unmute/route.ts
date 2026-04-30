import { RoomServiceClient } from "livekit-server-sdk";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomName, participantIdentity } = await req.json();

  const roomService = new RoomServiceClient(
    process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET
  );

  try {
    await roomService.updateParticipant(roomName, participantIdentity, undefined, {
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to unmute:", error);
    return NextResponse.json({ error: "Failed to unmute" }, { status: 500 });
  }
}
