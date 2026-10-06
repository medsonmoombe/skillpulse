import { db } from "@/db";
import { securityAuditLogs } from "@/db/schema";
import { sql } from "drizzle-orm";

type SecurityEventLevel = "info" | "warn" | "error";

type SecurityEvent = {
  event: string;
  level?: SecurityEventLevel;
  userId?: string | null;
  targetId?: string | null;
  route?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

let securityAuditTableExistsPromise: Promise<boolean> | null = null;

async function hasSecurityAuditLogTable() {
  if (!securityAuditTableExistsPromise) {
    securityAuditTableExistsPromise = db
      .execute<{ exists: boolean }>(sql`
        select exists (
          select 1
          from information_schema.tables
          where table_schema = 'public'
            and table_name = 'security_audit_logs'
        ) as "exists"
      `)
      .then((result) => Boolean(result[0]?.exists))
      .catch(() => false);
  }

  return securityAuditTableExistsPromise;
}

export async function logSecurityEvent({
  event,
  level = "warn",
  userId = null,
  targetId = null,
  route,
  reason,
  metadata,
}: SecurityEvent) {
  const payload = {
    event,
    userId,
    targetId,
    route,
    reason,
    ...(metadata ? { metadata } : {}),
  };

  const message = `[security] ${event}`;

  if (level === "error") {
    console.error(message, payload);
  } else if (level === "info") {
    console.info(message, payload);
  } else {
    console.warn(message, payload);
  }

  if (!(await hasSecurityAuditLogTable())) {
    return;
  }

  try {
    await db.insert(securityAuditLogs).values({
      event,
      level,
      userId,
      targetId,
      route,
      reason,
      metadata: metadata ?? {},
    });
  } catch (error) {
    console.error("[security] failed to persist audit log", {
      event,
      userId,
      targetId,
      route,
      reason,
      error,
    });
  }
}
