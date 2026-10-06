import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { groupMemberships, groups, users } from "@/db/schema";

export type GroupJoinMode = "open" | "approval_required";
export type GroupMessagePolicy = "all_members" | "admins_only";
export type GroupMembershipStatus = "pending" | "approved";
export type GroupRole = "admin" | "moderator" | "member";

export type GroupSummary = {
  id: string;
  name: string;
  slug: string;
  description: string;
  topicId: string | null;
  coverImageUrl: string | null;
  createdBy: string;
  isPrivate: boolean;
  joinMode: GroupJoinMode;
  memberMessagingPolicy: GroupMessagePolicy;
  createdAt: Date;
};

export type GroupMembershipRecord = {
  userId: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  role: GroupRole;
  status: GroupMembershipStatus;
  joinedAt: Date;
};

export type GroupMembershipState = {
  groupId?: string;
  role: GroupRole;
  status: GroupMembershipStatus;
} | null;

let groupGovernanceColumnsPromise: Promise<boolean> | null = null;
let groupMembershipWorkflowColumnsPromise: Promise<boolean> | null = null;
let groupMembershipApprovalColumnsPromise: Promise<boolean> | null = null;

export function hasGroupGovernanceColumns() {
  if (!groupGovernanceColumnsPromise) {
    groupGovernanceColumnsPromise = db
      .execute<{ exists: boolean }>(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'groups'
            and column_name = 'join_mode'
        ) as "exists"
      `)
      .then((result) => Boolean(result[0]?.exists))
      .catch(() => false);
  }

  return groupGovernanceColumnsPromise;
}

export function hasGroupMembershipWorkflowColumns() {
  if (!groupMembershipWorkflowColumnsPromise) {
    groupMembershipWorkflowColumnsPromise = db
      .execute<{ exists: boolean }>(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'group_memberships'
            and column_name = 'status'
        ) as "exists"
      `)
      .then((result) => Boolean(result[0]?.exists))
      .catch(() => false);
  }

  return groupMembershipWorkflowColumnsPromise;
}

export function hasGroupMembershipApprovalColumns() {
  if (!groupMembershipApprovalColumnsPromise) {
    groupMembershipApprovalColumnsPromise = db
      .execute<{ count: number }>(sql`
        select count(*)::int as "count"
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'group_memberships'
          and column_name in ('approved_by', 'approved_at')
      `)
      .then((result) => Number(result[0]?.count ?? 0) === 2)
      .catch(() => false);
  }

  return groupMembershipApprovalColumnsPromise;
}

export async function listGroupsWithGovernance(): Promise<GroupSummary[]> {
  const hasGovernance = await hasGroupGovernanceColumns();

  if (hasGovernance) {
    const result = await db.execute<GroupSummary>(sql`
      select
        "id",
        "name",
        "slug",
        "description",
        "topic_id" as "topicId",
        "cover_image_url" as "coverImageUrl",
        "created_by" as "createdBy",
        "is_private" as "isPrivate",
        "join_mode" as "joinMode",
        "member_messaging_policy" as "memberMessagingPolicy",
        "created_at" as "createdAt"
      from "groups"
      order by "created_at" desc
    `);

    return result.map((group) => ({
      ...group,
      joinMode: group.joinMode ?? "open",
      memberMessagingPolicy: group.memberMessagingPolicy ?? "all_members",
    }));
  }

  const result = await db.execute<Omit<GroupSummary, "joinMode" | "memberMessagingPolicy">>(sql`
    select
      "id",
      "name",
      "slug",
      "description",
      "topic_id" as "topicId",
      "cover_image_url" as "coverImageUrl",
      "created_by" as "createdBy",
      "is_private" as "isPrivate",
      "created_at" as "createdAt"
    from "groups"
    order by "created_at" desc
  `);

  return result.map((group) => ({
    ...group,
    joinMode: "open",
    memberMessagingPolicy: "all_members",
  }));
}

export async function getGroupBySlugWithGovernance(slugValue: string): Promise<GroupSummary | null> {
  const hasGovernance = await hasGroupGovernanceColumns();

  if (hasGovernance) {
    const result = await db.execute<GroupSummary>(sql`
      select
        "id",
        "name",
        "slug",
        "description",
        "topic_id" as "topicId",
        "cover_image_url" as "coverImageUrl",
        "created_by" as "createdBy",
        "is_private" as "isPrivate",
        "join_mode" as "joinMode",
        "member_messaging_policy" as "memberMessagingPolicy",
        "created_at" as "createdAt"
      from "groups"
      where "slug" = ${slugValue}
      limit 1
    `);

    const group = result[0];
    return group
      ? {
          ...group,
          joinMode: group.joinMode ?? "open",
          memberMessagingPolicy: group.memberMessagingPolicy ?? "all_members",
        }
      : null;
  }

  const result = await db.execute<Omit<GroupSummary, "joinMode" | "memberMessagingPolicy">>(sql`
    select
      "id",
      "name",
      "slug",
      "description",
      "topic_id" as "topicId",
      "cover_image_url" as "coverImageUrl",
      "created_by" as "createdBy",
      "is_private" as "isPrivate",
      "created_at" as "createdAt"
    from "groups"
    where "slug" = ${slugValue}
    limit 1
  `);

  const group = result[0];
  return group
    ? {
        ...group,
        joinMode: "open",
        memberMessagingPolicy: "all_members",
      }
    : null;
}

export async function ensureGroupCreatorAdminMembership(groupId: string) {
  const [group] = await db
    .select({
      id: groups.id,
      createdBy: groups.createdBy,
    })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) {
    return;
  }

  const [existingMembership] = await db
    .select({
      id: groupMemberships.id,
      role: groupMemberships.role,
    })
    .from(groupMemberships)
    .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, group.createdBy)))
    .limit(1);

  const hasWorkflowColumns = await hasGroupMembershipWorkflowColumns();
  const hasApprovalColumns = hasWorkflowColumns
    ? await hasGroupMembershipApprovalColumns()
    : false;
  const now = new Date();

  if (!existingMembership) {
    try {
      await db.insert(groupMemberships).values({
        groupId,
        userId: group.createdBy,
        role: "admin",
        ...(hasWorkflowColumns
          ? {
              status: "approved",
              ...(hasApprovalColumns
                ? {
                    approvedBy: group.createdBy,
                    approvedAt: now,
                  }
                : {}),
            }
          : {}),
        joinedAt: now,
      });
    } catch {
      await db.insert(groupMemberships).values({
        groupId,
        userId: group.createdBy,
        role: "admin",
        joinedAt: now,
      });
    }
    return;
  }

  if (existingMembership.role !== "admin") {
    try {
      await db
        .update(groupMemberships)
        .set({
          role: "admin",
          ...(hasWorkflowColumns
            ? {
                status: "approved",
                ...(hasApprovalColumns
                  ? {
                      approvedBy: group.createdBy,
                      approvedAt: now,
                    }
                  : {}),
              }
            : {}),
        })
        .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, group.createdBy)));
    } catch {
      await db
        .update(groupMemberships)
        .set({
          role: "admin",
        })
        .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, group.createdBy)));
    }
  } else if (hasWorkflowColumns && hasApprovalColumns) {
    try {
      await db.execute(sql`
        update "group_memberships"
        set
          "status" = 'approved',
          "approved_by" = ${group.createdBy},
          "approved_at" = coalesce("approved_at", ${now})
        where "group_id" = ${groupId}
          and "user_id" = ${group.createdBy}
      `);
    } catch {
      // Older databases may not have the full approval workflow columns yet.
    }
  }
}

export async function listGroupMembers(groupId: string): Promise<GroupMembershipRecord[]> {
  await ensureGroupCreatorAdminMembership(groupId);
  const hasWorkflowColumns = await hasGroupMembershipWorkflowColumns();

  if (hasWorkflowColumns) {
    try {
      return await db.execute<GroupMembershipRecord>(sql`
        select
          gm."user_id" as "userId",
          u."username" as "username",
          u."display_name" as "name",
          u."avatar_url" as "avatar",
          gm."role" as "role",
          gm."status" as "status",
          gm."joined_at" as "joinedAt"
        from "group_memberships" gm
        left join "users" u on u."id" = gm."user_id"
        where gm."group_id" = ${groupId}
        order by
          case gm."role" when 'admin' then 0 when 'moderator' then 1 else 2 end,
          case gm."status" when 'approved' then 0 else 1 end,
          gm."joined_at" asc
      `);
    } catch {
      // Fall through to legacy membership shape.
    }
  }

  const rows = await db
    .select({
      userId: groupMemberships.userId,
      username: users.username,
      name: users.displayName,
      avatar: users.avatarUrl,
      role: groupMemberships.role,
      joinedAt: groupMemberships.joinedAt,
    })
    .from(groupMemberships)
    .leftJoin(users, eq(groupMemberships.userId, users.id))
    .where(eq(groupMemberships.groupId, groupId));

  return rows.map((row) => ({
    ...row,
    status: "approved",
  }));
}

export async function getGroupMembershipState(groupId: string, userId: string): Promise<GroupMembershipState> {
  await ensureGroupCreatorAdminMembership(groupId);
  const hasWorkflowColumns = await hasGroupMembershipWorkflowColumns();

  if (hasWorkflowColumns) {
    try {
      const result = await db.execute<GroupMembershipState extends infer T ? Exclude<T, null> : never>(sql`
        select
          "group_id" as "groupId",
          "role" as "role",
          "status" as "status"
        from "group_memberships"
        where "group_id" = ${groupId}
          and "user_id" = ${userId}
        limit 1
      `);

      return result[0] ?? null;
    } catch {
      // Fall through to legacy membership shape.
    }
  }

  const [membership] = await db
    .select({
      role: groupMemberships.role,
    })
    .from(groupMemberships)
    .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, userId)))
    .limit(1);

  return membership ? { role: membership.role, status: "approved" } : null;
}

export async function listUserGroupMembershipStates(userId: string) {
  const hasWorkflowColumns = await hasGroupMembershipWorkflowColumns();

  if (hasWorkflowColumns) {
    try {
      return await db.execute<{
        groupId: string;
        role: GroupRole;
        status: GroupMembershipStatus;
      }>(sql`
        select
          "group_id" as "groupId",
          "role" as "role",
          "status" as "status"
        from "group_memberships"
        where "user_id" = ${userId}
      `);
    } catch {
      // Fall through to legacy membership shape.
    }
  }

  const memberships = await db
    .select({
      groupId: groupMemberships.groupId,
      role: groupMemberships.role,
    })
    .from(groupMemberships)
    .where(eq(groupMemberships.userId, userId));

  return memberships.map((membership) => ({
    ...membership,
    status: "approved" as const,
  }));
}

export async function requestOrJoinGroup(userId: string, groupId: string) {
  await ensureGroupCreatorAdminMembership(groupId);
  const [groupRows, membership] = await Promise.all([
    db
      .select({
        id: groups.id,
        slug: groups.slug,
        createdBy: groups.createdBy,
      })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1),
    getGroupMembershipState(groupId, userId),
  ]);

  const group = groupRows[0];

  if (!group) {
    return {
      status: "missing" as const,
      redirectPath: "/dashboard/groups",
      message: "This group could not be found.",
    };
  }

  if (membership?.status === "approved") {
    return {
      status: "joined" as const,
      redirectPath: `/dashboard/groups/${group.slug}/chat`,
      message: "You are already in this group.",
    };
  }

  if (membership?.status === "pending") {
    return {
      status: "pending" as const,
      redirectPath: `/dashboard/groups?join=requested&group=${group.slug}`,
      message: "Your request is already pending approval.",
    };
  }

  const governance = await getGroupGovernance(groupId);
  const requiresApproval = governance.joinMode === "approval_required";
  const now = new Date();
  const hasWorkflowColumns = await hasGroupMembershipWorkflowColumns();
  const hasApprovalColumns = hasWorkflowColumns
    ? await hasGroupMembershipApprovalColumns()
    : false;

  try {
    await db.insert(groupMemberships).values({
      groupId,
      userId,
      role: "member",
      ...(hasWorkflowColumns
        ? requiresApproval
          ? {
              status: "pending",
            }
          : {
              status: "approved",
              ...(hasApprovalColumns
                ? {
                    approvedBy: group.createdBy,
                    approvedAt: now,
                  }
                : {}),
            }
        : {}),
      joinedAt: now,
    });
  } catch {
    await db.insert(groupMemberships).values({
      groupId,
      userId,
      role: "member",
      joinedAt: now,
    });
  }

  return requiresApproval
    ? {
        status: "pending" as const,
        redirectPath: `/dashboard/groups?join=requested&group=${group.slug}`,
        message: "Your join request has been sent to the group admins.",
      }
    : {
        status: "joined" as const,
        redirectPath: `/dashboard/groups/${group.slug}/chat`,
        message: "You joined the group.",
      };
}

export async function getGroupGovernance(groupId: string) {
  const group = await getGroupByIdWithGovernance(groupId);
  return {
    joinMode: group?.joinMode ?? "open",
    memberMessagingPolicy: group?.memberMessagingPolicy ?? "all_members",
  };
}

export async function getGroupByIdWithGovernance(groupId: string): Promise<GroupSummary | null> {
  const hasGovernance = await hasGroupGovernanceColumns();

  if (hasGovernance) {
    const result = await db.execute<GroupSummary>(sql`
      select
        "id",
        "name",
        "slug",
        "description",
        "topic_id" as "topicId",
        "cover_image_url" as "coverImageUrl",
        "created_by" as "createdBy",
        "is_private" as "isPrivate",
        "join_mode" as "joinMode",
        "member_messaging_policy" as "memberMessagingPolicy",
        "created_at" as "createdAt"
      from "groups"
      where "id" = ${groupId}
      limit 1
    `);

    const group = result[0];
    return group
      ? {
          ...group,
          joinMode: group.joinMode ?? "open",
          memberMessagingPolicy: group.memberMessagingPolicy ?? "all_members",
        }
      : null;
  }

  const [group] = await db
    .select({
      id: groups.id,
      name: groups.name,
      slug: groups.slug,
      description: groups.description,
      topicId: groups.topicId,
      coverImageUrl: groups.coverImageUrl,
      createdBy: groups.createdBy,
      isPrivate: groups.isPrivate,
      createdAt: groups.createdAt,
    })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  return group
    ? {
        ...group,
        joinMode: "open",
        memberMessagingPolicy: "all_members",
      }
    : null;
}

export async function canUserManageGroup(groupId: string, userId: string) {
  const membership = await getGroupMembershipState(groupId, userId);
  return membership?.status === "approved" && membership.role === "admin";
}

export async function canUserSendGroupMessages(groupId: string, userId: string) {
  const membership = await getGroupMembershipState(groupId, userId);

  if (!membership || membership.status !== "approved") {
    return false;
  }

  const governance = await getGroupGovernance(groupId);
  if (governance.memberMessagingPolicy === "admins_only") {
    return membership.role === "admin";
  }

  return true;
}
