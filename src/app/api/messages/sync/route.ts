import { Liveblocks } from "@liveblocks/node";
import { NextResponse } from "next/server";
import { stringifyCommentBody, type CommentBody } from "@liveblocks/core";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, conversationParticipants } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import {
  getAccessibleConversation,
  getConversationNotificationRecipients,
  getConversationParticipantIds,
} from "@/lib/messaging";
import { NotificationService } from "@/services/notificationService";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: {
    conversationId?: string;
    threadId?: string;
    body?: CommentBody;
    attachments?: Array<{
      name?: string | null;
      type?: string | null;
      mimeType?: string | null;
      size?: number | null;
    }>;
  };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid message payload" }, { status: 400 });
  }

  if (!payload.conversationId || !payload.body) {
    return NextResponse.json({ error: "Missing conversationId or body" }, { status: 400 });
  }

  const accessibleConversation = await getAccessibleConversation(payload.conversationId, user.id);
  if (!accessibleConversation) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (accessibleConversation.membership?.canMessage === false) {
    return NextResponse.json({ error: "You cannot send messages in this conversation right now." }, { status: 403 });
  }

  const preview = (await stringifyCommentBody(payload.body, { format: "plain" })).trim();
  const attachments = (payload.attachments ?? []).map((attachment) => ({
    name: attachment.name ?? null,
    type: attachment.type ?? attachment.mimeType ?? null,
  }));

  if (attachments.length > 10) {
    return NextResponse.json({ error: "Too many attachments" }, { status: 400 });
  }

  const attachmentPreview = buildAttachmentPreview(attachments);
  const combinedPreview = preview
    ? attachmentPreview
      ? `${preview} - ${attachmentPreview}`
      : preview
    : attachmentPreview || "Sent an attachment";
  const previewText =
    combinedPreview.length > 160 ? `${combinedPreview.slice(0, 157)}...` : combinedPreview;

  if (!preview.trim() && attachments.length === 0) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(conversations)
      .set({
        lastMessagePreview: previewText || "Sent an attachment",
        lastMessageAt: now,
        updatedAt: now,
      })
      .where(eq(conversations.id, payload.conversationId!));

    await tx
      .update(conversationParticipants)
      .set({
        lastSeenAt: now,
        lastReadAt: now,
      })
      .where(
        and(
          eq(conversationParticipants.conversationId, payload.conversationId!),
          eq(conversationParticipants.userId, user.id)
        )
      );
  });

  const recipients = await getConversationNotificationRecipients(payload.conversationId, user.id);
  const notificationType =
    accessibleConversation.conversation.type === "group" ? "group_message" : "direct_message";
  const notificationTitle =
    accessibleConversation.conversation.type === "group"
      ? `${user.displayName} sent a message`
      : `New message from ${user.displayName}`;

  await Promise.all(
    recipients.map((recipient) =>
      NotificationService.create({
        userId: recipient.userId,
        title: notificationTitle,
        message: previewText || "Sent an attachment",
        type: notificationType,
        entityType: "conversation",
        entityId: payload.conversationId,
        actionUrl: `/dashboard/messages/${payload.conversationId}`,
      })
    )
  );

  // Broadcast a lightweight real-time event to every participant's presence room
  // so their sidebar badge updates instantly without polling.
  try {
    const participantIds = await getConversationParticipantIds(
      accessibleConversation.conversation
    );
    await Promise.all(
      participantIds
        .filter((id) => id !== user.id)
        .map((id) =>
          liveblocks.broadcastEvent(`user-inbox-${id}`, {
            type: "new_message",
            conversationId: payload.conversationId,
            preview: previewText,
          })
        )
    );
  } catch {
    // Non-fatal — polling fallback still works if broadcast fails
  }

  return NextResponse.json({
    success: true,
    preview: previewText,
    updatedAt: now.toISOString(),
  });
}

function buildAttachmentPreview(
  attachments: Array<{
    name?: string | null;
    type?: string | null;
  }>
) {
  if (attachments.length === 0) {
    return "";
  }

  if (attachments.length === 1) {
    const [attachment] = attachments;

    if (attachment?.type?.startsWith("image/")) {
      return "sent an image";
    }

    if (attachment?.type?.startsWith("video/")) {
      return "sent a video";
    }

    return attachment?.name ? `shared ${attachment.name}` : "sent an attachment";
  }

  const imageCount = attachments.filter((attachment) => attachment.type?.startsWith("image/")).length;

  if (imageCount === attachments.length) {
    return `sent ${attachments.length} images`;
  }

  return `shared ${attachments.length} attachments`;
}
