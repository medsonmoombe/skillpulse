import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/currentUser";
import { getRoomAccess } from "@/lib/room-access";
import { markRoomAttendanceEvent } from "@/lib/lesson-live";
import { db } from "@/db";
import { roomBookings } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const attendanceSchema = z.object({
  roomId: z.string().uuid(),
  event: z.enum(["join", "leave"]),
  occurredAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roomId = req.nextUrl.searchParams.get("roomId");
  if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });

  const [booking] = await db
    .select({ attendanceStatus: roomBookings.attendanceStatus })
    .from(roomBookings)
    .where(and(eq(roomBookings.roomId, roomId), eq(roomBookings.userId, user.id)))
    .limit(1);

  return NextResponse.json({ attendanceStatus: booking?.attendanceStatus ?? "not_joined" });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = attendanceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid attendance payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const access = await getRoomAccess(user.id, parsed.data.roomId);
  if (!access.allowed || access.isHost) {
    return NextResponse.json({ error: "Only enrolled learners can record attendance." }, { status: 403 });
  }

  try {
    const booking = await markRoomAttendanceEvent({
      roomId: parsed.data.roomId,
      userId: user.id,
      event: parsed.data.event,
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : undefined,
    });
    return NextResponse.json({ booking });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update attendance" }, { status: 400 });
  }
}
