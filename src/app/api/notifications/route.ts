import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([]);

  const userNotifs = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return NextResponse.json(userNotifs);
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let ids: string[] | undefined;

  try {
    const body = await req.json();
    ids = Array.isArray(body?.ids) ? body.ids : undefined;
  } catch {
    ids = undefined;
  }

  const whereClause =
    ids && ids.length > 0
      ? and(eq(notifications.userId, user.id), inArray(notifications.id, ids))
      : eq(notifications.userId, user.id);

  await db
    .update(notifications)
    .set({ read: true, readAt: sql`now()` })
    .where(whereClause);

  return NextResponse.json({ success: true });
}
