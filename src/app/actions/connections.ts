"use server";

import { db } from "@/db";
import { connections, notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq, and, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function sendConnectionRequest(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const addresseeId = formData.get("addresseeId") as string;
  if (!addresseeId || addresseeId === user.id) throw new Error("Invalid request");

  try {
    await db.insert(connections).values({
      requesterId: user.id,
      addresseeId,
      status: "pending",
    });

    await db.insert(notifications).values({
      userId: addresseeId,
      title: `${user.displayName} wants to connect`,
      message: "You have a new connection request.",
      type: "system",
      entityType: "profile",
      entityId: user.id,
      actionUrl: `/profile/${user.id}`,
    });
  } catch {
    // Ignore duplicate
  }

  revalidatePath(`/profile/${addresseeId}`);
}

export async function acceptConnection(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const connectionId = formData.get("connectionId") as string;

  await db
    .update(connections)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(and(eq(connections.id, connectionId), eq(connections.addresseeId, user.id)));

  revalidatePath("/dashboard");
}

export async function rejectConnection(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const connectionId = formData.get("connectionId") as string;

  await db
    .update(connections)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(and(eq(connections.id, connectionId), eq(connections.addresseeId, user.id)));

  revalidatePath("/dashboard");
}

export async function removeConnection(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const connectionId = formData.get("connectionId") as string;

  await db
    .delete(connections)
    .where(
      and(
        eq(connections.id, connectionId),
        or(eq(connections.requesterId, user.id), eq(connections.addresseeId, user.id))
      )
    );

  revalidatePath("/dashboard");
}

export async function getConnectionStatus(currentUserId: string, targetUserId: string) {
  const [conn] = await db
    .select()
    .from(connections)
    .where(
      or(
        and(eq(connections.requesterId, currentUserId), eq(connections.addresseeId, targetUserId)),
        and(eq(connections.requesterId, targetUserId), eq(connections.addresseeId, currentUserId))
      )
    )
    .limit(1);

  return conn ?? null;
}
