import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { db } from "@/db";
import { operationalEvents } from "@/db/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { sendAppEmail } from "@/lib/mailer";

// Only retry events that have been failed for at least 5 minutes
// to avoid hammering a provider that's mid-outage.
const RETRY_AFTER_MS = 5 * 60 * 1000;
const MAX_RETRIES_PER_RUN = 20;

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cutoff = new Date(Date.now() - RETRY_AFTER_MS);

  const candidates = await db
    .select()
    .from(operationalEvents)
    .where(
      and(
        eq(operationalEvents.status, "failed"),
        lte(operationalEvents.updatedAt, cutoff)
      )
    )
    .orderBy(operationalEvents.createdAt)
    .limit(MAX_RETRIES_PER_RUN);

  if (candidates.length === 0) {
    return NextResponse.json({ retried: 0, message: "No eligible failed events." });
  }

  let retried = 0;
  let succeeded = 0;

  for (const event of candidates) {
    retried++;
    const payload = event.payload as Record<string, unknown>;

    try {
      // Re-dispatch based on event type
      if (
        event.event === "instant_live_email" ||
        event.event === "room_summary_email"
      ) {
        const to = payload.recipientEmail ?? payload.participantEmail;
        const subject = event.event === "instant_live_email"
          ? `${process.env.NEXT_PUBLIC_APP_NAME}: A live session is happening now`
          : `${process.env.NEXT_PUBLIC_APP_NAME}: Your session summary`;


        if (typeof to === "string") {
          const sent = await sendAppEmail({ to, subject, text: "Please check " + process.env.NEXT_PUBLIC_APP_NAME + " for details." });
          if (sent) {
            await db.update(operationalEvents)
              .set({ status: "success", lastError: null, updatedAt: new Date() })
              .where(eq(operationalEvents.id, event.id));
            succeeded++;
          } else {
            // Still not deliverable — update timestamp so it won't be retried again immediately
            await db.update(operationalEvents)
              .set({ updatedAt: new Date() })
              .where(eq(operationalEvents.id, event.id));
          }
        }
      } else {
        // Unknown event type — mark as permanently failed so it doesn't clog the queue
        await db.update(operationalEvents)
          .set({
            status: "failed",
            lastError: `No retry handler for event type: ${event.event}`,
            updatedAt: new Date(),
          })
          .where(eq(operationalEvents.id, event.id));
      }
    } catch (err) {
      await db.update(operationalEvents)
        .set({
          lastError: err instanceof Error ? err.message : "Unknown retry error",
          updatedAt: new Date(),
        })
        .where(eq(operationalEvents.id, event.id));
    }
  }

  return NextResponse.json({ retried, succeeded });
}
