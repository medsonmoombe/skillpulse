"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { groupMemberships, groups } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import {
  canUserManageGroup,
  ensureGroupCreatorAdminMembership,
  getGroupByIdWithGovernance,
  hasGroupMembershipApprovalColumns,
  hasGroupGovernanceColumns,
  hasGroupMembershipWorkflowColumns,
  type GroupJoinMode,
  type GroupMessagePolicy,
  type GroupRole,
} from "@/lib/group-governance";
import { syncGroupConversationParticipants, syncGroupConversationPermissions } from "@/lib/messaging";

const allowedJoinModes = new Set<GroupJoinMode>(["open", "approval_required"]);
const allowedMessagePolicies = new Set<GroupMessagePolicy>(["all_members", "admins_only"]);
const allowedRoles = new Set<GroupRole>(["admin", "moderator", "member"]);

function buildGroupSlug(name: string) {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);

  return `${baseSlug || "group"}-${Date.now().toString(36)}`;
}

async function assertGroupAdmin(groupId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  await ensureGroupCreatorAdminMembership(groupId);

  if (!(await canUserManageGroup(groupId, user.id))) {
    throw new Error("Only group admins can manage this group.");
  }

  return user;
}

function revalidateGroupPaths(groupSlug: string) {
  revalidatePath("/dashboard/groups");
  revalidatePath(`/dashboard/groups/${groupSlug}`);
  revalidatePath(`/dashboard/groups/${groupSlug}/chat`);
}

export async function updateGroupGovernance(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const joinMode = String(formData.get("joinMode") ?? "") as GroupJoinMode;
  const memberMessagingPolicy = String(formData.get("memberMessagingPolicy") ?? "") as GroupMessagePolicy;

  if (!groupId || !allowedJoinModes.has(joinMode) || !allowedMessagePolicies.has(memberMessagingPolicy)) {
    throw new Error("Invalid group governance settings.");
  }

  await assertGroupAdmin(groupId);

  if (await hasGroupGovernanceColumns()) {
    await db
      .update(groups)
      .set({
        joinMode,
        memberMessagingPolicy,
      })
      .where(eq(groups.id, groupId));
  }

  const group = await getGroupByIdWithGovernance(groupId);
  if (!group) {
    throw new Error("Group not found.");
  }

  await syncGroupConversationParticipants(groupId);
  await syncGroupConversationPermissions(groupId);
  revalidateGroupPaths(group.slug);
}

export async function approveGroupMember(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const targetUserId = String(formData.get("targetUserId") ?? "");

  if (!groupId || !targetUserId) {
    throw new Error("Invalid approval request.");
  }

  const actor = await assertGroupAdmin(groupId);

  if (await hasGroupMembershipWorkflowColumns()) {
    if (await hasGroupMembershipApprovalColumns()) {
      await db.execute(sql`
        update "group_memberships"
        set
          "status" = 'approved',
          "approved_by" = ${actor.id},
          "approved_at" = ${new Date().toISOString()}
        where "group_id" = ${groupId}
          and "user_id" = ${targetUserId}
      `);
    } else {
      await db.execute(sql`
        update "group_memberships"
        set "status" = 'approved'
        where "group_id" = ${groupId}
          and "user_id" = ${targetUserId}
      `);
    }
  }

  const group = await getGroupByIdWithGovernance(groupId);
  if (!group) {
    throw new Error("Group not found.");
  }

  await syncGroupConversationParticipants(groupId);
  await syncGroupConversationPermissions(groupId);
  revalidateGroupPaths(group.slug);
}

export async function updateGroupMemberRole(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const targetUserId = String(formData.get("targetUserId") ?? "");
  const role = String(formData.get("role") ?? "") as GroupRole;

  if (!groupId || !targetUserId || !allowedRoles.has(role)) {
    throw new Error("Invalid member role update.");
  }

  await assertGroupAdmin(groupId);

  const group = await getGroupByIdWithGovernance(groupId);
  if (!group) {
    throw new Error("Group not found.");
  }

  if (group.createdBy === targetUserId && role !== "admin") {
    throw new Error("The group creator must remain an admin.");
  }

  await db
    .update(groupMemberships)
    .set({
      role,
    })
    .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, targetUserId)));

  await syncGroupConversationPermissions(groupId);
  revalidateGroupPaths(group.slug);
}

export async function rejectGroupMember(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const targetUserId = String(formData.get("targetUserId") ?? "");

  if (!groupId || !targetUserId) {
    throw new Error("Invalid reject request.");
  }

  await assertGroupAdmin(groupId);

  const group = await getGroupByIdWithGovernance(groupId);
  if (!group) {
    throw new Error("Group not found.");
  }

  await db
    .delete(groupMemberships)
    .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, targetUserId)));

  await syncGroupConversationParticipants(groupId);
  await syncGroupConversationPermissions(groupId);
  revalidateGroupPaths(group.slug);
}

export async function removeGroupMember(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "");
  const targetUserId = String(formData.get("targetUserId") ?? "");

  if (!groupId || !targetUserId) {
    throw new Error("Invalid remove request.");
  }

  await assertGroupAdmin(groupId);

  const group = await getGroupByIdWithGovernance(groupId);
  if (!group) {
    throw new Error("Group not found.");
  }

  if (group.createdBy === targetUserId) {
    throw new Error("The group creator cannot be removed.");
  }

  await db
    .delete(groupMemberships)
    .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, targetUserId)));

  await syncGroupConversationParticipants(groupId);
  await syncGroupConversationPermissions(groupId);
  revalidateGroupPaths(group.slug);
}

export async function createGroup(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const topicIdRaw = String(formData.get("topicId") ?? "").trim();
  const coverImageUrlRaw = String(formData.get("coverImageUrl") ?? "").trim();
  const joinMode = String(formData.get("joinMode") ?? "open") as GroupJoinMode;
  const memberMessagingPolicy = String(formData.get("memberMessagingPolicy") ?? "all_members") as GroupMessagePolicy;
  const isPrivate = formData.get("isPrivate") === "on";

  if (!name || !description) {
    throw new Error("Group name and description are required.");
  }

  if (!allowedJoinModes.has(joinMode) || !allowedMessagePolicies.has(memberMessagingPolicy)) {
    throw new Error("Invalid group settings.");
  }

  const supportsGovernanceColumns = await hasGroupGovernanceColumns();
  const supportsWorkflowColumns = await hasGroupMembershipWorkflowColumns();
  const supportsApprovalColumns = supportsWorkflowColumns ? await hasGroupMembershipApprovalColumns() : false;
  const now = new Date();

  const [newGroup] = await db
    .insert(groups)
    .values({
      name,
      slug: buildGroupSlug(name),
      description,
      topicId: topicIdRaw || null,
      coverImageUrl: coverImageUrlRaw || null,
      createdBy: user.id,
      isPrivate,
      ...(supportsGovernanceColumns
        ? {
            joinMode,
            memberMessagingPolicy,
          }
        : {}),
      createdAt: now,
    })
    .returning({
      id: groups.id,
      slug: groups.slug,
    });

  try {
    await db.insert(groupMemberships).values({
      groupId: newGroup.id,
      userId: user.id,
      role: "admin",
      ...(supportsWorkflowColumns
        ? {
            status: "approved",
            ...(supportsApprovalColumns
              ? {
                  approvedBy: user.id,
                  approvedAt: now,
                }
              : {}),
          }
        : {}),
      joinedAt: now,
    });
  } catch {
    await ensureGroupCreatorAdminMembership(newGroup.id);
  }

  revalidatePath("/dashboard/groups");
  revalidatePath("/dashboard");
  redirect(`/dashboard/groups/${newGroup.slug}`);
}
