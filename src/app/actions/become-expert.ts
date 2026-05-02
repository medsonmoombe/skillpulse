"use server";

import { db } from "@/db";
import { expertApplications, expertProfiles, users, notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { BecomeExpertState } from "./become-expert-types";

export async function submitExpertApplication(
  _prev: BecomeExpertState,
  formData: FormData
): Promise<BecomeExpertState> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Unauthorized" };
  if (user.role === "expert") return { success: false, message: "You are already an expert." };

  const headline = (formData.get("headline") as string)?.trim();
  const bio = (formData.get("bio") as string)?.trim();
  const linkedinUrl = (formData.get("linkedinUrl") as string)?.trim() || null;
  const portfolioUrl = (formData.get("portfolioUrl") as string)?.trim() || null;
  const credentialUrl = (formData.get("credentialUrl") as string)?.trim() || null;
  const yearsExperience = parseInt(formData.get("yearsExperience") as string, 10);

  if (!headline || !bio || isNaN(yearsExperience)) {
    return { success: false, message: "Please fill in all required fields." };
  }

  // Upsert application
  await db
    .insert(expertApplications)
    .values({
      userId: user.id,
      headline,
      bio,
      linkedinUrl,
      portfolioUrl,
      credentialUrl,
      yearsExperience,
      status: "pending",
      submittedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: expertApplications.userId,
      set: { headline, bio, linkedinUrl, portfolioUrl, credentialUrl, yearsExperience, status: "pending", submittedAt: new Date() },
    });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/become-expert");

  return { success: true, message: "Application submitted! We'll review it and notify you." };
}

// Admin action to approve an application (can be called from admin panel later)
export async function approveExpertApplication(userId: string) {
  const now = new Date();

  await db.update(users).set({ role: "expert", updatedAt: now }).where(eq(users.id, userId));

  await db
    .insert(expertProfiles)
    .values({ userId, verificationStatus: "verified", updatedAt: now })
    .onConflictDoUpdate({
      target: expertProfiles.userId,
      set: { verificationStatus: "verified", updatedAt: now },
    });

  await db
    .update(expertApplications)
    .set({ status: "approved", reviewedAt: now })
    .where(eq(expertApplications.userId, userId));

  await db.insert(notifications).values({
    userId,
    title: "You're now an Expert! 🎉",
    message: "Your expert application has been approved. Update your profile to start teaching.",
    type: "system",
    entityType: "profile",
    actionUrl: "/dashboard/settings",
  });

  revalidatePath("/dashboard");
}
