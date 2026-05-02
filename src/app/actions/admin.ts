"use server";

import { db } from "@/db";
import { expertApplications, expertProfiles, users, notifications, articles, rooms } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) throw new Error("Unauthorized — admin only");
  return user;
}

export async function approveApplication(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const now = new Date();

  await db.update(users).set({ role: "expert", updatedAt: now }).where(eq(users.id, userId));
  await db
    .insert(expertProfiles)
    .values({ userId, verificationStatus: "verified", updatedAt: now })
    .onConflictDoUpdate({ target: expertProfiles.userId, set: { verificationStatus: "verified", updatedAt: now } });
  await db.update(expertApplications).set({ status: "approved", reviewedAt: now }).where(eq(expertApplications.userId, userId));
  await db.insert(notifications).values({
    userId, title: "You're now an Expert! 🎉",
    message: "Your expert application has been approved. Update your profile to start teaching.",
    type: "system", entityType: "profile", actionUrl: "/dashboard/settings",
  });
  revalidatePath("/dashboard/admin");
}

export async function rejectApplication(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const note = (formData.get("note") as string) || "Application did not meet requirements.";
  await db.update(expertApplications).set({ status: "rejected", reviewNote: note, reviewedAt: new Date() }).where(eq(expertApplications.userId, userId));
  await db.insert(notifications).values({
    userId, title: "Expert Application Update",
    message: `Your application was not approved at this time. ${note}`,
    type: "system", entityType: "profile", actionUrl: "/dashboard/become-expert",
  });
  revalidatePath("/dashboard/admin");
}

export async function suspendUser(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  await db.update(users).set({ isSuspended: true, updatedAt: new Date() }).where(eq(users.id, userId));
  await db.insert(notifications).values({
    userId, title: "Account Suspended",
    message: "Your account has been suspended. Contact support if you believe this is an error.",
    type: "system", entityType: "profile",
  });
  revalidatePath("/dashboard/admin");
}

export async function unsuspendUser(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  await db.update(users).set({ isSuspended: false, updatedAt: new Date() }).where(eq(users.id, userId));
  revalidatePath("/dashboard/admin");
}

export async function deleteUser(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  // Cascades handle related records via FK constraints
  await db.delete(users).where(eq(users.id, userId));
  revalidatePath("/dashboard/admin");
}

export async function setUserRole(formData: FormData) {
  await requireAdmin();
  const userId = formData.get("userId") as string;
  const role = formData.get("role") as "learner" | "expert";
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
  revalidatePath("/dashboard/admin");
}

export async function deleteArticleAsAdmin(formData: FormData) {
  await requireAdmin();
  const articleId = formData.get("articleId") as string;
  await db.delete(articles).where(eq(articles.id, articleId));
  revalidatePath("/dashboard/admin");
}
