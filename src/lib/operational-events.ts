import { db } from "@/db";
import { operationalEvents } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

type OperationalEventStatus = "pending" | "success" | "failed";

type CreateOperationalEventInput = {
  event: string;
  scope: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  status?: OperationalEventStatus;
  lastError?: string;
};

let operationalEventsTableExistsPromise: Promise<boolean> | null = null;

async function hasOperationalEventsTable() {
  if (!operationalEventsTableExistsPromise) {
    operationalEventsTableExistsPromise = db
      .execute<{ exists: boolean }>(sql`
        select exists (
          select 1
          from information_schema.tables
          where table_schema = 'public'
            and table_name = 'operational_events'
        ) as "exists"
      `)
      .then((result) => Boolean(result[0]?.exists))
      .catch(() => false);
  }

  return operationalEventsTableExistsPromise;
}

export async function createOperationalEvent(input: CreateOperationalEventInput) {
  if (!(await hasOperationalEventsTable())) {
    return null;
  }

  try {
    const [created] = await db
      .insert(operationalEvents)
      .values({
        event: input.event,
        scope: input.scope,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload ?? {},
        status: input.status ?? "pending",
        lastError: input.lastError,
      })
      .returning({
        id: operationalEvents.id,
      });

    return created?.id ?? null;
  } catch (error) {
    console.error("[ops] failed to create operational event", {
      event: input.event,
      scope: input.scope,
      entityType: input.entityType,
      entityId: input.entityId,
      error,
    });
    return null;
  }
}

export async function updateOperationalEvent(
  id: string | null,
  input: {
    status: OperationalEventStatus;
    payload?: Record<string, unknown>;
    lastError?: string | null;
  }
) {
  if (!id || !(await hasOperationalEventsTable())) {
    return;
  }

  try {
    await db
      .update(operationalEvents)
      .set({
        status: input.status,
        payload: input.payload ?? {},
        lastError: input.lastError ?? null,
        updatedAt: new Date(),
      })
      .where(eq(operationalEvents.id, id));
  } catch (error) {
    console.error("[ops] failed to update operational event", {
      id,
      status: input.status,
      error,
    });
  }
}
