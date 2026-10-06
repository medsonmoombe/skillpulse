import { db } from "@/db";
import { rooms } from "@/db/schema";
import { and, eq, lt } from "drizzle-orm";

const STALE_ROOM_GRACE_MINUTES = 30;

export function getStaleScheduledRoomCutoff(now = new Date()) {
  return new Date(now.getTime() - STALE_ROOM_GRACE_MINUTES * 60 * 1000);
}

export function getEffectiveRoomStatus<T extends string | null>(
  status: T,
  startsAt: Date | null,
  now = new Date()
) {
  if (status === "scheduled" && startsAt && startsAt < getStaleScheduledRoomCutoff(now)) {
    return "expired" as const;
  }

  return status;
}

export async function expireStaleScheduledRooms() {
  const cutoff = getStaleScheduledRoomCutoff();

  await db
    .update(rooms)
    .set({ status: "expired" })
    .where(and(eq(rooms.status, "scheduled"), lt(rooms.startsAt, cutoff)));
}
