import { db } from "@/db";
import { groupMemberships } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { NextResponse } from "next/server";

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

  try {
    await db.insert(groupMemberships).values({
      groupId: groupId,
      userId: user.id,
      role: "member",
    });
  } catch (error) {
    // Ignore unique violation (user is already a member)
    console.error("Failed to join group:", error);
  }

  // Redirect back to the groups page
  return NextResponse.redirect(new URL("/dashboard/groups", req.url));
}