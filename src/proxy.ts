import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/api/webhooks/clerk"]);
const isSuspendedAllowedRoute = createRouteMatcher(["/api/webhooks/(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  const { userId } = await auth();
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (userId && !isPublicRoute(req) && !isSuspendedAllowedRoute(req)) {
    try {
      // Dynamic import keeps DB drivers out of the middleware bundle,
      // which is what was breaking Clerk's middleware detection.
      const { db } = await import("@/db");
      const { users } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");

      const [user] = await db
        .select({ isSuspended: users.isSuspended })
        .from(users)
        .where(eq(users.clerkId, userId))
        .limit(1);

      if (user?.isSuspended) {
        const url = req.nextUrl.clone();
        url.pathname = "/";
        url.searchParams.set("suspended", "1");
        return NextResponse.redirect(url);
      }
    } catch {
      // Fail open on DB errors — page-level auth is the second line of defence.
    }
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
