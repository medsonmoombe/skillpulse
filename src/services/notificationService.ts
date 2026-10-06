import { Liveblocks } from "@liveblocks/node";
import type { Json } from "@liveblocks/client";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { createOperationalEvent } from "@/lib/operational-events";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

type NotificationType =
  | "booking"
  | "session_start"
  | "admit"
  | "direct_message"
  | "group_message"
  | "match_suggestion"
  | "system";

type EntityType =
  | "room"
  | "conversation"
  | "group"
  | "message"
  | "profile"
  | "article"
  | "system";

type CreateParams = {
  userId: string;
  title: string;
  message?: string;
  type: NotificationType;
  entityType?: EntityType;
  entityId?: string;
  actionUrl?: string;
};

async function broadcastToUser(userId: string, event: Record<string, unknown>) {
  try {
    await liveblocks.broadcastEvent(`user-inbox-${userId}`, event as Json);
  } catch (error) {
    // Non-fatal because polling still allows the client to catch up.
    await createOperationalEvent({
      event: "notification_realtime_broadcast_failed",
      scope: "notification.broadcast",
      entityType: "user",
      entityId: userId,
      status: "failed",
      payload: {
        channel: `user-inbox-${userId}`,
        eventType: typeof event.type === "string" ? event.type : "unknown",
      },
      lastError: error instanceof Error ? error.message : "Unknown Liveblocks broadcast error",
    });
  }
}

export const NotificationService = {
  async create(params: CreateParams) {
    try {
      await db.insert(notifications).values({
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        entityType: params.entityType ?? "system",
        entityId: params.entityId,
        actionUrl: params.actionUrl,
      });

      await broadcastToUser(params.userId, {
        type: "new_notification",
        notificationType: params.type,
      });
    } catch (error) {
      console.error("Failed to create notification:", error);
      await createOperationalEvent({
        event: "notification_create_failed",
        scope: "notification.create",
        entityType: params.entityType ?? "system",
        entityId: params.entityId ?? params.userId,
        status: "failed",
        payload: {
          userId: params.userId,
          type: params.type,
          actionUrl: params.actionUrl ?? null,
        },
        lastError: error instanceof Error ? error.message : "Unknown notification create error",
      });
    }
  },

  async createIfNotRecent(params: CreateParams & { dedupeHours?: number }) {
    try {
      const { dedupeHours = 72, ...rest } = params;
      const cutoff = new Date(Date.now() - dedupeHours * 60 * 60 * 1000);

      const [existing] = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, params.userId),
            eq(notifications.type, params.type),
            eq(notifications.entityType, params.entityType ?? "system"),
            params.entityId
              ? eq(notifications.entityId, params.entityId)
              : eq(notifications.actionUrl, params.actionUrl ?? ""),
            gte(notifications.createdAt, cutoff)
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(1);

      if (existing) return;

      await NotificationService.create(rest);
    } catch (error) {
      console.error("Failed to create deduped notification:", error);
      await createOperationalEvent({
        event: "notification_dedupe_failed",
        scope: "notification.dedupe",
        entityType: params.entityType ?? "system",
        entityId: params.entityId ?? params.userId,
        status: "failed",
        payload: {
          userId: params.userId,
          type: params.type,
          dedupeHours: params.dedupeHours ?? 72,
          actionUrl: params.actionUrl ?? null,
        },
        lastError: error instanceof Error ? error.message : "Unknown notification dedupe error",
      });
    }
  },
};
