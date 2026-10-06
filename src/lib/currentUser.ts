import { auth } from "@clerk/nextjs/server";
import { db, withRetry } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureUserSettingsRow } from "@/lib/user-settings-compat";
import { ensureDemoWalletForUser } from "@/lib/demo-wallet";
import { cache } from "react";

type GetCurrentUserOptions = {
  /** Pass true only for admin/suspension-management flows */
  allowSuspended?: boolean;
};

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

const getCachedCurrentUser = cache(async (allowSuspended: boolean) => {
  const { userId } = await auth();
  if (!userId) return null;

  // Retry on Supabase cold start / statement timeouts.
  // We distinguish three outcomes:
  //   1. User found → return (or null if suspended)
  //   2. DB error → throw so callers can show a proper error, not a silent null
  //   3. User not in DB yet → create from Clerk (dev / missed webhook)
  let existingUser: typeof users.$inferSelect | null;

  try {
    existingUser = await withRetry(() =>
      db.select().from(users).where(eq(users.clerkId, userId)).then(([u]) => u ?? null),
    2);
  } catch (err) {
    // Log the error but return null — throwing here 500s every API route on cold start.
    // The caller (page/API route) will redirect to sign-in or show an error boundary.
    console.error("[getCurrentUser] DB error after retries:", {
      message: (err as Error)?.message,
      code: (err as { code?: string })?.code,
      userId,
    });
    return null;
  }

  if (existingUser) {
    // Suspended check: middleware already blocks most routes, but this is the
    // last line of defence for any route that slips through (e.g. API routes).
    if (existingUser.isSuspended && !allowSuspended) {
      return null;
    }
    // Fire-and-forget: ensure settings row exists without blocking the response.
    void ensureUserSettingsRow(existingUser.id).catch((err) =>
      console.warn("[getCurrentUser] ensureUserSettingsRow failed:", (err as Error)?.message),
    );
    void ensureDemoWalletForUser(existingUser.id).catch((err) =>
      console.warn("[getCurrentUser] ensureDemoWalletForUser failed:", (err as Error)?.message),
    );
    return existingUser;
  }

  // User not in DB — create from Clerk data (handles dev env / missed webhooks).
  // This is intentionally a fallback, not the primary path.
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ");
    const username = `${email.split("@")[0]}${Math.random().toString(36).slice(2, 7)}`;

    const [newUser] = await db
      .insert(users)
      .values({
        clerkId: userId,
        email,
        username,
        displayName: fullName || "Anonymous User",
        avatarUrl: clerkUser.imageUrl,
        role: "learner",
      })
      .returning();

    void ensureUserSettingsRow(newUser.id).catch((err) =>
      console.warn("[getCurrentUser] ensureUserSettingsRow failed:", (err as Error)?.message),
    );
    void ensureDemoWalletForUser(newUser.id).catch((err) =>
      console.warn("[getCurrentUser] ensureDemoWalletForUser failed:", (err as Error)?.message),
    );
    return newUser;
  } catch (err) {
    // Auto-create failed (e.g. duplicate email race condition).
    // Log with enough context to diagnose, but don't crash the request —
    // returning null lets the caller redirect to sign-in gracefully.
    console.error("[getCurrentUser] Failed to auto-create user from Clerk:", (err as Error)?.message);
    return null;
  }
});

export async function getCurrentUser(options: GetCurrentUserOptions = {}) {
  return getCachedCurrentUser(Boolean(options.allowSuspended));
}
