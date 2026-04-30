import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  // 1. Get the Clerk auth state
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // 2. Check if the user exists in our Supabase database
  const [existingUser] = await db.select().from(users).where(eq(users.clerkId, userId));

  // 3. If they exist, return them
  if (existingUser) {
    return existingUser;
  }

  // 4. If they DON'T exist (local dev mode without webhooks), fetch from Clerk and create them
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    const email = clerkUser.emailAddresses[0]?.emailAddress || "";
    const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ");
    const username = email.split("@")[0] + Math.random().toString(36).substring(7);

    const [newUser] = await db.insert(users).values({
      clerkId: userId,
      email: email,
      username: username,
      displayName: fullName || "Anonymous User",
      avatarUrl: clerkUser.imageUrl,
      role: "learner",
    }).returning();

    return newUser;
  } catch (error) {
    console.error("Failed to create user from Clerk:", error);
    return null;
  }
}