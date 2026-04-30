"use server";

import { db } from "@/db";
import { rooms } from "@/db/schema";
import { and, lt, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function cleanupStaleRooms() {
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

  await db
    .update(rooms)
    .set({ status: "expired" })
    .where(
      and(
        eq(rooms.status, "scheduled"),
        lt(rooms.startsAt, thirtyMinsAgo)
      )
    );
}

export async function activateRoom(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const roomId = formData.get("roomId") as string;
  if (!roomId) throw new Error("Room ID is required");

  await db
    .update(rooms)
    .set({ status: "active" })
    .where(and(eq(rooms.id, roomId), eq(rooms.hostId, user.id)));

  revalidatePath("/dashboard");
  redirect(`/dashboard/room/${roomId}`);
}
