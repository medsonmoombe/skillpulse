import { db } from "@/db";
import { rooms } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect("/dashboard");

  const formData = await req.formData();
  const roomId = formData.get("roomId") as string;

  // Security: Only host can activate
  await db
    .update(rooms)
    .set({ status: "active" })
    .where(and(eq(rooms.id, roomId), eq(rooms.hostId, user.id)));

  // Redirect back to the room page (which will now show the Live Room)
  return NextResponse.redirect(new URL(`/dashboard/room/${roomId}`, req.url));
}