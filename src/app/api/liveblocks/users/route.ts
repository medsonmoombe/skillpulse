import { db } from "@/db";
import { users } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userIds = searchParams.getAll("userIds");

  if (userIds.length === 0) {
    return NextResponse.json([]);
  }

  const rows = await db
    .select({ id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl })
    .from(users)
    .where(inArray(users.id, userIds));

  const byId = new Map(rows.map((u) => [u.id, u]));

  const resolved = userIds.map((id) => {
    const u = byId.get(id);
    return {
      name: u?.displayName ?? "Unknown",
      avatar: u?.avatarUrl ?? undefined,
    };
  });

  return NextResponse.json(resolved);
}
