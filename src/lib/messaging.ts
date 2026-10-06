import { db, withRetry } from "@/db";
import {
  conversationParticipants,
  conversations,
  groups,
  groupMemberships,
  userTopics,
  userSettings,
  users,
} from "@/db/schema";
import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import {
  canUserSendGroupMessages,
  ensureGroupCreatorAdminMembership,
  getGroupGovernance,
  getGroupMembershipState,
  hasGroupMembershipWorkflowColumns,
  type GroupMembershipStatus,
} from "@/lib/group-governance";

type ConversationRecord = typeof conversations.$inferSelect;
type ParticipantRecord = typeof conversationParticipants.$inferSelect;
type UserRecord = typeof users.$inferSelect;

export type ConversationPreview = {
  id: string;
  roomId: string;
  type: ConversationRecord["type"];
  title: string;
  subtitle: string;
  imageUrl: string | null;
  participantCount: number;
  updatedAt: Date;
  unreadCount: number;
};

export type AccessibleConversation = {
  conversation: ConversationRecord;
  membership: ParticipantRecord | null;
  participants: ParticipantRecord[];
  participantIds: string[];
  otherUser: Pick<UserRecord, "id" | "displayName" | "avatarUrl"> | null;
};

export type DirectMessageEligibility = {
  allowed: boolean;
  reason: string | null;
  existingConversationId: string | null;
  targetUser: Pick<UserRecord, "id" | "displayName" | "avatarUrl" | "role"> | null;
};

export type UnreadConversationSummary = {
  unreadConversations: number;
  unreadMessages: number;
};

type GroupConversationResult = {
  success: boolean;
  conversationId: string | null;
  message: string | null;
};

function getConversationRoomId(conversationId: string) {
  return `conversation-${conversationId}`;
}

function normalizeDirectConversationPair(userA: string, userB: string) {
  return [userA, userB].sort((left, right) => left.localeCompare(right)) as [string, string];
}

async function findExistingDirectConversation(userA: string, userB: string) {
  const [directConversation] = await db
    .select()
    .from(conversations)
    .where(
      or(
        and(
          eq(conversations.type, "direct"),
          eq(conversations.participantA, userA),
          eq(conversations.participantB, userB)
        ),
        and(
          eq(conversations.type, "direct"),
          eq(conversations.participantA, userB),
          eq(conversations.participantB, userA)
        )
      )
    );

  return directConversation ?? null;
}

async function hasStrongTopicMatch(currentUserId: string, targetUserId: string) {
  const relationships = await db
    .select({
      userId: userTopics.userId,
      topicId: userTopics.topicId,
    })
    .from(userTopics)
    .where(
      or(eq(userTopics.userId, currentUserId), eq(userTopics.userId, targetUserId))
    );

  const currentUserTopics = new Set(
    relationships
      .filter((relationship) => relationship.userId === currentUserId)
      .map((relationship) => relationship.topicId)
  );

  return relationships.some(
    (relationship) =>
      relationship.userId === targetUserId && currentUserTopics.has(relationship.topicId)
  );
}

export async function getDirectMessageEligibility(
  currentUserId: string,
  targetUserId: string
): Promise<DirectMessageEligibility> {
  if (currentUserId === targetUserId) {
    return {
      allowed: false,
      reason: "You cannot start a direct conversation with yourself.",
      existingConversationId: null,
      targetUser: null,
    };
  }

  const [target] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      allowDirectMessages: userSettings.allowDirectMessages,
      directMessagePrivacy: userSettings.directMessagePrivacy,
    })
    .from(users)
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(eq(users.id, targetUserId));

  if (!target) {
    return {
      allowed: false,
      reason: "This user could not be found.",
      existingConversationId: null,
      targetUser: null,
    };
  }

  const existingConversation = await findExistingDirectConversation(currentUserId, targetUserId);

  if (existingConversation) {
    return {
      allowed: true,
      reason: null,
      existingConversationId: existingConversation.id,
      targetUser: target,
    };
  }

  if (target.allowDirectMessages === false) {
    return {
      allowed: false,
      reason: `${target.displayName} is not accepting direct messages right now.`,
      existingConversationId: null,
      targetUser: target,
    };
  }

  if (target.directMessagePrivacy === "nobody") {
    return {
      allowed: false,
      reason: `${target.displayName} has closed direct messages.`,
      existingConversationId: null,
      targetUser: target,
    };
  }

  if (target.directMessagePrivacy === "matches_only") {
    const isStrongMatch = await hasStrongTopicMatch(currentUserId, targetUserId);

    if (!isStrongMatch) {
      return {
        allowed: false,
        reason: `${target.displayName} only accepts direct messages from strong matches right now.`,
        existingConversationId: null,
        targetUser: target,
      };
    }
  }

  return {
    allowed: true,
    reason: null,
    existingConversationId: null,
    targetUser: target,
  };
}

async function getConversationParticipants(conversationId: string) {
  return db
    .select()
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId));
}

function getLegacyConversationParticipantIds(conversation: ConversationRecord) {
  return [conversation.participantA, conversation.participantB].filter(
    (participantId): participantId is string => Boolean(participantId)
  );
}

export async function getConversationParticipantIds(conversation: ConversationRecord) {
  const participants = await getConversationParticipants(conversation.id);
  const participantIds = new Set<string>([
    ...participants.map((participant) => participant.userId),
    ...getLegacyConversationParticipantIds(conversation),
  ]);

  return Array.from(participantIds);
}

export async function getConversationNotificationRecipients(
  conversationId: string,
  actorUserId: string
) {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId));

  if (!conversation) {
    return [];
  }

  const recipients = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      canMessage: conversationParticipants.canMessage,
      notificationsMuted: conversationParticipants.notificationsMuted,
      inAppNotifications: userSettings.inAppNotifications,
    })
    .from(conversationParticipants)
    .innerJoin(users, eq(users.id, conversationParticipants.userId))
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        ne(conversationParticipants.userId, actorUserId)
      )
    );

  const recipientMap = new Map(
    recipients.map((recipient) => [recipient.userId, recipient])
  );

  for (const legacyParticipantId of getLegacyConversationParticipantIds(conversation)) {
    if (legacyParticipantId === actorUserId || recipientMap.has(legacyParticipantId)) {
      continue;
    }

    const [legacyRecipient] = await db
      .select({
        userId: users.id,
        displayName: users.displayName,
        inAppNotifications: userSettings.inAppNotifications,
      })
      .from(users)
      .leftJoin(userSettings, eq(userSettings.userId, users.id))
      .where(eq(users.id, legacyParticipantId));

    if (legacyRecipient) {
      recipientMap.set(legacyRecipient.userId, {
        ...legacyRecipient,
        canMessage: true,
        notificationsMuted: false,
      });
    }
  }

  return Array.from(recipientMap.values()).filter(
    (recipient) => recipient.notificationsMuted !== true && recipient.inAppNotifications !== false
  );
}

async function getOtherDirectUser(conversation: ConversationRecord, currentUserId: string) {
  // Collect all candidate IDs for the other user
  const candidateIds = [
    conversation.participantA,
    conversation.participantB,
  ].filter((id): id is string => Boolean(id) && id !== currentUserId);

  // Also check conversationParticipants table
  const participantRows = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversation.id),
        ne(conversationParticipants.userId, currentUserId)
      )
    )
    .limit(1);

  if (participantRows[0]) {
    candidateIds.push(participantRows[0].userId);
  }

  const otherId = candidateIds[0];
  if (!otherId) return null;

  const [otherUser] = await db
    .select({ id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, otherId))
    .limit(1);

  return otherUser ?? null;
}

async function buildConversationPreview(
  conversation: ConversationRecord,
  currentUserId: string
): Promise<ConversationPreview> {
  const participants = await getConversationParticipants(conversation.id);
  const currentMembership =
    participants.find((participant) => participant.userId === currentUserId) ?? null;
  const updatedAt = conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt;
  const isUnread =
    Boolean(conversation.lastMessageAt) &&
    (!currentMembership?.lastReadAt ||
      conversation.lastMessageAt!.getTime() > currentMembership.lastReadAt.getTime());
  const unreadCount = isUnread ? 1 : 0;

  if (conversation.type === "group") {
    return {
      id: conversation.id,
      roomId: getConversationRoomId(conversation.id),
      type: conversation.type,
      title: conversation.title ?? "Group conversation",
      subtitle:
        conversation.lastMessagePreview ??
        `${participants.length || 0} member${participants.length === 1 ? "" : "s"}`,
      imageUrl: conversation.imageUrl,
      participantCount: participants.length,
      updatedAt,
      unreadCount,
    };
  }

  const otherUser = await getOtherDirectUser(conversation, currentUserId);

  return {
    id: conversation.id,
    roomId: getConversationRoomId(conversation.id),
    type: conversation.type,
    title: otherUser?.displayName ?? "Conversation",
    subtitle: conversation.lastMessagePreview ?? "Open this conversation to continue chatting.",
    imageUrl: otherUser?.avatarUrl ?? conversation.imageUrl,
    participantCount: Math.max(participants.length, 2),
    updatedAt,
    unreadCount,
  };
}

export async function listUserConversations(userId: string) {
  // Single query: get all conversations the user is part of (both legacy and participant table)
  const rows = await db.execute<{
    id: string;
    type: string;
    title: string | null;
    image_url: string | null;
    last_message_preview: string | null;
    last_message_at: Date | null;
    updated_at: Date;
    created_at: Date;
    participant_a: string | null;
    participant_b: string | null;
    last_read_at: Date | null;
    participant_count: number;
  }>(sql`
    select
      c.id,
      c.type,
      c.title,
      c.image_url,
      c.last_message_preview,
      c.last_message_at,
      c.updated_at,
      c.created_at,
      c.participant_a,
      c.participant_b,
      cp.last_read_at,
      (select count(*)::int from conversation_participants where conversation_id = c.id) as participant_count
    from conversations c
    left join conversation_participants cp
      on cp.conversation_id = c.id and cp.user_id = ${userId}
    where
      cp.user_id = ${userId}
      or c.participant_a = ${userId}
      or c.participant_b = ${userId}
    order by coalesce(c.last_message_at, c.updated_at, c.created_at) desc
  `);

  // Deduplicate (user may appear in both legacy columns and participant table)
  const seen = new Set<string>();
  const unique = rows.filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });

  // Resolve other-user names for direct conversations in one batch query
  const directRows = unique.filter((r) => r.type === "direct");
  const otherUserIds = Array.from(new Set(
    directRows.flatMap((r) => [
      r.participant_a !== userId ? r.participant_a : null,
      r.participant_b !== userId ? r.participant_b : null,
    ].filter((id): id is string => Boolean(id)))
  ));

  const otherUsers = otherUserIds.length
    ? await db
        .select({ id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl })
        .from(users)
        .where(sql`${users.id} = ANY(ARRAY[${sql.join(otherUserIds.map((id) => sql`${id}::uuid`), sql`, `)}])`)
    : [];
  const otherUserMap = new Map(otherUsers.map((u) => [u.id, u]));

  return unique.map((r) => {
    const updatedAt = r.last_message_at ?? r.updated_at ?? r.created_at;
    const isUnread = Boolean(r.last_message_at) &&
      (!r.last_read_at || new Date(r.last_message_at!).getTime() > new Date(r.last_read_at).getTime());

    if (r.type === "group") {
      return {
        id: r.id,
        roomId: getConversationRoomId(r.id),
        type: "group" as const,
        title: r.title ?? "Group conversation",
        subtitle: r.last_message_preview ?? `${r.participant_count} members`,
        imageUrl: r.image_url,
        participantCount: r.participant_count,
        updatedAt: new Date(updatedAt),
        unreadCount: isUnread ? 1 : 0,
      };
    }

    const otherId = r.participant_a !== userId ? r.participant_a : r.participant_b;
    const other = otherId ? otherUserMap.get(otherId) : null;

    return {
      id: r.id,
      roomId: getConversationRoomId(r.id),
      type: "direct" as const,
      title: other?.displayName ?? "Conversation",
      subtitle: r.last_message_preview ?? "Open this conversation to continue chatting.",
      imageUrl: other?.avatarUrl ?? r.image_url,
      participantCount: Math.max(r.participant_count, 2),
      updatedAt: new Date(updatedAt),
      unreadCount: isUnread ? 1 : 0,
    };
  });
}

export async function getAccessibleConversation(conversationId: string, userId: string) {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId));

  if (!conversation) {
    return null;
  }

  const [membership] = await db
    .select()
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      )
    );

  const isLegacyParticipant =
    conversation.participantA === userId || conversation.participantB === userId;

  if (!membership && !isLegacyParticipant) {
    return null;
  }

  const participants = await getConversationParticipants(conversationId);
  const otherUser =
    conversation.type === "direct"
      ? await getOtherDirectUser(conversation, userId)
      : null;

  return {
    conversation,
    membership: membership ?? null,
    participants,
    participantIds: await getConversationParticipantIds(conversation),
    otherUser,
  } satisfies AccessibleConversation;
}

export async function markConversationRead(conversationId: string, userId: string) {
  const now = new Date();

  await db
    .update(conversationParticipants)
    .set({
      lastReadAt: now,
      lastSeenAt: now,
    })
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId)
      )
    );
}

export async function getUnreadConversationSummary(userId: string): Promise<UnreadConversationSummary> {
  // Single aggregated query instead of loading all conversation previews
  const result = await withRetry(() =>
    db.execute<{ unread_conversations: number; unread_messages: number }>(sql`
    select
      count(distinct c.id)::int as unread_conversations,
      count(distinct c.id)::int as unread_messages
    from conversations c
    left join conversation_participants cp
      on cp.conversation_id = c.id and cp.user_id = ${userId}
    where
      -- user is a participant (new or legacy)
      (
        cp.user_id = ${userId}
        or c.participant_a = ${userId}
        or c.participant_b = ${userId}
      )
      -- there is a last message
      and c.last_message_at is not null
      -- and it's unread
      and (
        cp.last_read_at is null
        or c.last_message_at > cp.last_read_at
      )
  `)
  );

  const row = result[0];
  const unreadConversations = Number(row?.unread_conversations ?? 0);

  return {
    unreadConversations,
    unreadMessages: unreadConversations,
  };
}

export async function createOrGetDirectConversation(currentUserId: string, targetUserId: string) {
  const eligibility = await getDirectMessageEligibility(currentUserId, targetUserId);

  if (!eligibility.allowed) {
    return {
      success: false as const,
      conversationId: eligibility.existingConversationId,
      message: eligibility.reason ?? "This conversation cannot be started right now.",
    };
  }

  if (eligibility.existingConversationId) {
    return {
      success: true as const,
      conversationId: eligibility.existingConversationId,
      message: null,
    };
  }

  const [participantA, participantB] = normalizeDirectConversationPair(currentUserId, targetUserId);
  const now = new Date();

  const createdConversation = await db.transaction(async (tx) => {
    const [conversation] = await tx
      .insert(conversations)
      .values({
        type: "direct",
        participantA,
        participantB,
        createdBy: currentUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await tx.insert(conversationParticipants).values([
      {
        conversationId: conversation.id,
        userId: currentUserId,
        role: "member",
        canMessage: true,
        joinedAt: now,
        lastReadAt: now,
        lastSeenAt: now,
      },
      {
        conversationId: conversation.id,
        userId: targetUserId,
        role: "member",
        canMessage: true,
        joinedAt: now,
      },
    ]);

    return conversation;
  });

  return {
    success: true as const,
    conversationId: createdConversation.id,
    message: null,
  };
}

async function listApprovedGroupMemberships(groupId: string) {
  await ensureGroupCreatorAdminMembership(groupId);
  const hasWorkflowColumns = await hasGroupMembershipWorkflowColumns();

  if (hasWorkflowColumns) {
    return db.execute<{
      userId: string;
      role: "admin" | "moderator" | "member";
      status: GroupMembershipStatus;
    }>(sql`
      select
        "user_id" as "userId",
        "role" as "role",
        "status" as "status"
      from "group_memberships"
      where "group_id" = ${groupId}
        and "status" = 'approved'
    `);
  }

  const memberships = await db
    .select({
      userId: groupMemberships.userId,
      role: groupMemberships.role,
    })
    .from(groupMemberships)
    .where(eq(groupMemberships.groupId, groupId));

  return memberships.map((membership) => ({
    ...membership,
    status: "approved" as const,
  }));
}

async function getGroupConversationId(groupId: string) {
  const [conversation] = await db
    .select({
      id: conversations.id,
    })
    .from(conversations)
    .where(and(eq(conversations.type, "group"), eq(conversations.groupId, groupId)))
    .limit(1);

  return conversation?.id ?? null;
}

export async function syncGroupConversationParticipants(groupId: string) {
  const conversationId = await getGroupConversationId(groupId);
  if (!conversationId) {
    return;
  }

  const [memberships, existingParticipants] = await Promise.all([
    listApprovedGroupMemberships(groupId),
    db
      .select({
        userId: conversationParticipants.userId,
      })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId)),
  ]);

  const existingUserIds = new Set(existingParticipants.map((participant) => participant.userId));
  const missingParticipants = memberships
    .map((membership) => membership.userId)
    .filter((userId) => !existingUserIds.has(userId));

  if (missingParticipants.length === 0) {
    return;
  }

  const now = new Date();

  await db.insert(conversationParticipants).values(
    missingParticipants.map((userId) => {
      const membership = memberships.find((entry) => entry.userId === userId);
      const participantRole =
        membership?.role === "admin"
          ? ("admin" as const)
          : ("member" as const);

      return {
        conversationId,
        userId,
        role: participantRole,
        canMessage: true,
        joinedAt: now,
      };
    })
  );
}

export async function syncGroupConversationPermissions(groupId: string) {
  const conversationId = await getGroupConversationId(groupId);
  if (!conversationId) return;

  // Resolve messaging policy once, then bulk-update in two queries instead of N
  const governance = await getGroupGovernance(groupId);
  const adminsOnly = governance.memberMessagingPolicy === "admins_only";

  const memberships = await listApprovedGroupMemberships(groupId);

  if (memberships.length === 0) return;

  if (adminsOnly) {
    // Admins can message, everyone else cannot — two bulk updates
    const adminIds = memberships.filter((m) => m.role === "admin").map((m) => m.userId);
    const memberIds = memberships.filter((m) => m.role !== "admin").map((m) => m.userId);

    if (adminIds.length > 0) {
      await db.execute(sql`
        update conversation_participants
        set role = 'admin', can_message = true
        where conversation_id = ${conversationId}
          and user_id = any(${sql.raw(`array[${adminIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})
      `);
    }
    if (memberIds.length > 0) {
      await db.execute(sql`
        update conversation_participants
        set role = 'member', can_message = false
        where conversation_id = ${conversationId}
          and user_id = any(${sql.raw(`array[${memberIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})
      `);
    }
  } else {
    // All members can message — single bulk update
    await db
      .update(conversationParticipants)
      .set({ canMessage: true })
      .where(eq(conversationParticipants.conversationId, conversationId));

    // Still sync roles (admin vs member) in one query
    const adminIds = memberships.filter((m) => m.role === "admin").map((m) => m.userId);
    if (adminIds.length > 0) {
      await db.execute(sql`
        update conversation_participants
        set role = 'admin'
        where conversation_id = ${conversationId}
          and user_id = any(${sql.raw(`array[${adminIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})
      `);
    }
  }
}

export async function createOrGetGroupConversation(
  currentUserId: string,
  groupId: string
): Promise<GroupConversationResult> {
  const [group] = await db
    .select({
      id: groups.id,
      name: groups.name,
      coverImageUrl: groups.coverImageUrl,
    })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) {
    return {
      success: false,
      conversationId: null,
      message: "This group could not be found.",
    };
  }

  const membership = await getGroupMembershipState(groupId, currentUserId);

  if (!membership || membership.status !== "approved") {
    return {
      success: false,
      conversationId: null,
      message: "You need approved access to this group before opening its chat.",
    };
  }

  const [existingConversation] = await db
    .select({
      id: conversations.id,
    })
    .from(conversations)
    .where(and(eq(conversations.type, "group"), eq(conversations.groupId, groupId)))
    .limit(1);

  if (existingConversation) {
    await syncGroupConversationParticipants(groupId);
    await syncGroupConversationPermissions(groupId);

    return {
      success: true,
      conversationId: existingConversation.id,
      message: null,
    };
  }

  const memberships = await listApprovedGroupMemberships(groupId);

  if (memberships.length === 0) {
    return {
      success: false,
      conversationId: null,
      message: "This group has no members available for chat yet.",
    };
  }

  const now = new Date();

  const createdConversation = await db.transaction(async (tx) => {
    const [conversation] = await tx
      .insert(conversations)
      .values({
        type: "group",
        groupId,
        createdBy: currentUserId,
        title: group.name,
        imageUrl: group.coverImageUrl,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await tx.insert(conversationParticipants).values(
      memberships.map((member) => ({
        conversationId: conversation.id,
        userId: member.userId,
        role:
          member.userId === currentUserId
            ? ("owner" as const)
            : member.role === "admin"
              ? ("admin" as const)
              : ("member" as const),
        canMessage: true,
        joinedAt: now,
        ...(member.userId === currentUserId
          ? {
              lastReadAt: now,
              lastSeenAt: now,
            }
          : {}),
      }))
    );

    return conversation;
  });

  await syncGroupConversationPermissions(groupId);

  return {
    success: true,
    conversationId: createdConversation.id,
    message: null,
  };
}

export { getConversationRoomId };
