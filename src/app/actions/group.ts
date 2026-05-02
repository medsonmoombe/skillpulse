"use server";

import { db } from "@/db";
import { groupPosts, groups } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { canUserManageGroup, canUserSendGroupMessages } from "@/lib/group-governance";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createGroupPost(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const groupId = formData.get("groupId") as string;
  const content = formData.get("content") as string;

  if (!groupId || !content) throw new Error("Group ID and content are required");

  if (!(await canUserSendGroupMessages(groupId, user.id))) {
    throw new Error("You are not allowed to send messages in this group right now.");
  }

  await db.insert(groupPosts).values({ groupId, authorId: user.id, content });
  revalidatePath(`/dashboard/groups/[slug]`, "page");
}

export async function updateGroup(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const groupId = formData.get("groupId") as string;
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const coverImageUrl = (formData.get("coverImageUrl") as string) || null;

  if (!name || !description) throw new Error("Name and description are required");

  const isAdmin = await canUserManageGroup(groupId, user.id);
  if (!isAdmin) throw new Error("Only admins can edit this group");

  const [updated] = await db
    .update(groups)
    .set({ name, description, coverImageUrl })
    .where(eq(groups.id, groupId))
    .returning({ slug: groups.slug });

  revalidatePath(`/dashboard/groups/${updated.slug}`);
  redirect(`/dashboard/groups/${updated.slug}`);
}
