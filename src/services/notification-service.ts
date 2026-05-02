import { Liveblocks } from "@liveblocks/node";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, desc, eq, gte } from "drizzle-orm";

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

import type { Json } from "@liveblocks/client";

async function broadcastToUser(userId: string, event: Record<string, unknown>) {
  try {
    await liveblocks.broadcastEvent(`user-inbox-${userId}`, event as Json);
  } catch {
    // Non-fatal — client polling fallback still works
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

      // Push real-time event so the client refreshes immediately
      await broadcastToUser(params.userId, {
        type: "new_notification",
        notificationType: params.type,
      });
    } catch (err) {
      console.error("Failed to create notification:", err);
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
    } catch (err) {
      console.error("Failed to create deduped notification:", err);
    }
  },
};
