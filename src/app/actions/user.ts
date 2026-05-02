"use server";

import { db } from "@/db";
import { users, userTopics } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { DiscoveryIntent } from "@/lib/discovery-intent";
import { updateDiscoveryIntentIfAvailable } from "@/lib/user-settings-compat";

export async function onboardUser(
  selectedTopicIds: string[],
  wantsToTeach: boolean,
  discoveryIntent: DiscoveryIntent
) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // 1. Update Role if they want to teach
  if (wantsToTeach && user.role === "learner") {
    await db.update(users).set({ role: "expert" }).where(eq(users.id, user.id));
  }

  // 2. Clear existing topics for this user to avoid duplicates
  await db.delete(userTopics).where(eq(userTopics.userId, user.id));

  // 3. Insert new selected topics
  if (selectedTopicIds.length > 0) {
    const values = selectedTopicIds.map((topicId) => ({
      userId: user.id,
      topicId: topicId,
      relationship: wantsToTeach ? "teaches" : "interested",
    }));
    await db.insert(userTopics).values(values);
  }

  await updateDiscoveryIntentIfAvailable(user.id, discoveryIntent);

  // 4. Refresh the Dashboard page so it shows the new data
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}
