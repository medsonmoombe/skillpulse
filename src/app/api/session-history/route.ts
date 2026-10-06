import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { listSessionHistoryForUser } from "@/lib/session-archive";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await listSessionHistoryForUser(user.id);
  return NextResponse.json({ sessions });
}
