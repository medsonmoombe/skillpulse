import { db } from "@/db";
import { groups } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requestOrJoinGroup } from "@/lib/group-governance";

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect("/dashboard");
  }

  const formData = await req.formData();
  const groupId = formData.get("groupId") as string;

  if (!groupId) {
    return NextResponse.redirect("/dashboard/groups");
  }

  const [group] = await db
    .select({
      slug: groups.slug,
    })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) {
    return NextResponse.redirect(new URL("/dashboard/groups", req.url));
  }

  const result = await requestOrJoinGroup(user.id, groupId);
  return NextResponse.redirect(new URL(result.redirectPath, req.url));
}
