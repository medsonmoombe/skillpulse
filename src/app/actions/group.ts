
"use server";

import { db } from "@/db";
import { groupPosts } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { revalidatePath } from "next/cache";

export async function createGroupPost(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const groupId = formData.get("groupId") as string;
  const content = formData.get("content") as string;

  if (!groupId || !content) {
    throw new Error("Group ID and content are required");
  }

  // Insert the post
  await db.insert(groupPosts).values({
    groupId: groupId,
    authorId: user.id,
    content: content,
  });

  // Refresh the page so the new message appears
  revalidatePath(`/dashboard/groups/[slug]`, "page");
}