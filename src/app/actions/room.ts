"use server";

import { db } from "@/db";
import { rooms } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { RoomServiceClient } from "livekit-server-sdk";
import { Liveblocks } from "@liveblocks/node";

const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY as string });

export async function startLiveRoom(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const groupId = (formData.get("groupId") as string) || null;
  const mode = (formData.get("mode") as string) || "instant";

  if (!title) throw new Error("Title is required");

  const livekitRoomId = `room-${Date.now()}`;

  const startsAtStr = formData.get("startsAt") as string;
  const endsAtStr = formData.get("endsAt") as string;

  const startsAt = startsAtStr ? new Date(startsAtStr) : null;
  const endsAt = endsAtStr ? new Date(endsAtStr) : null;
  const isInstant = mode === "instant";
  const autoAdmit = formData.get("autoAdmit") === "on";

  const [newRoom] = await db
    .insert(rooms)
    .values({
      hostId: user.id,
      groupId,
      title,
      livekitRoomId,
      status: isInstant ? "active" : "scheduled",
      startsAt,
      endsAt,
      autoAdmit,
    })
    .returning();

  revalidatePath("/dashboard");

  if (isInstant) {
    redirect(`/dashboard/room/${newRoom.id}`);
  } else {
    redirect("/dashboard");
  }
}

export async function endLiveRoom(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const roomId = formData.get("roomId") as string;
  if (!roomId) throw new Error("Room ID is required");

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room || room.hostId !== user.id) throw new Error("Only the host can end this room");

  // 1. Update DB first
  await db.update(rooms).set({ status: "ended" }).where(eq(rooms.id, roomId));

  // 2. Broadcast instant kick via Liveblocks
  try {
    await liveblocks.broadcastEvent(roomId, { type: "SESSION_ENDED" });
  } catch (error) {
    console.error("Failed to broadcast SESSION_ENDED:", error);
  }

  // 3. Force-kick LiveKit audio
  try {
    const roomService = new RoomServiceClient(
      process.env.NEXT_PUBLIC_LIVEKIT_URL!,
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    );
    await roomService.deleteRoom(room.livekitRoomId);
  } catch (error) {
    console.error("Failed to delete LiveKit room:", error);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
