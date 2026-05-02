"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { expertProfiles, users, userTopics } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { hasExpertProfileMediaColumns } from "@/lib/expert-profile-compat";
import type { ProfileActionState } from "./profile-types";

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  bio: z.string().trim().max(1000),
  avatarUrl: z.union([z.literal(""), z.url()]),
  headline: z.string().trim().max(150),
  introImageUrl: z.union([z.literal(""), z.url()]),
  introVideoUrl: z.union([z.literal(""), z.url()]),
  availability: z.string().trim(),
  hourlyRate: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+$/.test(v), "Hourly rate must be a whole number.")
    .transform((v) => (v === "" ? 0 : Number(v))),
});

export async function updateProfileDetails(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "You need to be signed in to update your profile." };

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio"),
    avatarUrl: formData.get("avatarUrl"),
    headline: formData.get("headline"),
    introImageUrl: formData.get("introImageUrl"),
    introVideoUrl: formData.get("introVideoUrl"),
    availability: formData.get("availability"),
    hourlyRate: formData.get("hourlyRate"),
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Please review your profile details." };
  }

  const { displayName, bio, avatarUrl, headline, introImageUrl, introVideoUrl, availability, hourlyRate } = parsed.data;
  const now = new Date();
  const parsedAvailability = parseAvailabilityPayload(availability);
  const supportsProfileMedia = await hasExpertProfileMediaColumns();

  if (!parsedAvailability.success) return { success: false, message: parsedAvailability.message };

  // Update base user — both learners and experts
  await db.update(users).set({
    displayName,
    bio: bio || null,
    avatarUrl: avatarUrl || null,
    updatedAt: now,
  }).where(eq(users.id, user.id));

  // Expert profile fields — available to experts only
  if (user.role === "expert") {
    const [existing] = await db.select({ id: expertProfiles.id }).from(expertProfiles).where(eq(expertProfiles.userId, user.id)).limit(1);
    const expertData = {
      headline: headline || null,
      hourlyRateCents: hourlyRate * 100,
      availability: parsedAvailability.value,
      ...(supportsProfileMedia ? { introImageUrl: introImageUrl || null, introVideoUrl: introVideoUrl || null } : {}),
      updatedAt: now,
    };
    if (existing) {
      await db.update(expertProfiles).set(expertData).where(eq(expertProfiles.userId, user.id));
    } else {
      await db.insert(expertProfiles).values({ userId: user.id, ...expertData });
    }
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath(`/profile/${user.id}`);

  return { success: true, message: "Profile updated successfully." };
}

// ─── Topic management (both roles) ───────────────────────────────────────────

export async function addUserTopic(formData: FormData): Promise<ProfileActionState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Unauthorized" };

  const topicId = formData.get("topicId") as string;
  const relationship = formData.get("relationship") as "interested" | "teaches";

  if (!topicId || !["interested", "teaches"].includes(relationship)) {
    return { success: false, message: "Invalid topic or relationship." };
  }

  try {
    await db.insert(userTopics).values({ userId: user.id, topicId, relationship });
  } catch {
    // Ignore duplicate
  }

  revalidatePath("/dashboard/settings");
  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/dashboard");
  return { success: true, message: "Topic added." };
}

export async function removeUserTopic(formData: FormData): Promise<ProfileActionState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Unauthorized" };

  const topicId = formData.get("topicId") as string;
  const relationship = formData.get("relationship") as string;

  await db.delete(userTopics).where(
    and(eq(userTopics.userId, user.id), eq(userTopics.topicId, topicId), eq(userTopics.relationship, relationship))
  );

  revalidatePath("/dashboard/settings");
  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/dashboard");
  return { success: true, message: "Topic removed." };
}

function parseAvailabilityPayload(raw: string) {
  if (!raw) return { success: true as const, value: {} };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized: Record<string, string[]> = {};
    for (const [day, value] of Object.entries(parsed)) {
      if (!Array.isArray(value)) continue;
      const validRanges = value.filter((e): e is string => typeof e === "string" && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(e));
      if (validRanges.length > 0) normalized[day] = validRanges;
    }
    return { success: true as const, value: normalized };
  } catch {
    return { success: false as const, message: "Availability data could not be saved." };
  }
}
