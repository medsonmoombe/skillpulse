import { db } from "@/db";
import {
  learningPlanLessonProgress,
  learningPlanLessons,
  learningPlanMembers,
  learningPlans,
  learningResources,
  topics,
  users,
} from "@/db/schema";
import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";

function normalizeNullable(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeRequiredLessonCount(value?: number | null) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value > 0 ? Math.floor(value) : null;
}

function resolvePlanLessonTarget(plan: {
  completionMode: string;
  requiredLessonCount: number | null;
  totalLessons: number;
}) {
  if (plan.completionMode === "ongoing_path") {
    return null;
  }

  if (plan.requiredLessonCount && plan.requiredLessonCount > 0) {
    return plan.requiredLessonCount;
  }

  return plan.totalLessons;
}

async function syncPlanCompletionState(planId: string) {
  const [plan] = await db
    .select({
      id: learningPlans.id,
      status: learningPlans.status,
      completionMode: learningPlans.completionMode,
      requiredLessonCount: learningPlans.requiredLessonCount,
      totalLessons: learningPlans.totalLessons,
    })
    .from(learningPlans)
    .where(eq(learningPlans.id, planId))
    .limit(1);

  if (!plan || plan.status === "archived") {
    return;
  }

  const members = await db
    .select({
      id: learningPlanMembers.id,
      status: learningPlanMembers.status,
    })
    .from(learningPlanMembers)
    .where(and(eq(learningPlanMembers.planId, planId), ne(learningPlanMembers.status, "removed")));

  if (members.length === 0) {
    return;
  }

  if (plan.completionMode === "fixed_curriculum") {
    const targetLessons = resolvePlanLessonTarget(plan);
    if (targetLessons && targetLessons > 0) {
      const progressCounts = await db.execute<{
        planMemberId: string;
        completedLessons: number;
      }>(sql`
        select
          lpp.plan_member_id as "planMemberId",
          count(*)::int as "completedLessons"
        from ${learningPlanLessonProgress} lpp
        inner join ${learningPlanLessons} lpl on lpl.id = lpp.lesson_id
        where lpl.plan_id = ${planId}::uuid
          and lpp.status = 'completed'
        group by lpp.plan_member_id
      `);

      const completedByMember = new Map(
        progressCounts.map((row) => [row.planMemberId, Number(row.completedLessons)])
      );

      for (const member of members) {
        const completedLessons = completedByMember.get(member.id) ?? 0;
        const shouldComplete = completedLessons >= targetLessons;
        if (shouldComplete && member.status !== "completed") {
          await db
            .update(learningPlanMembers)
            .set({
              status: "completed",
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(learningPlanMembers.id, member.id));
        }
      }

      const allCompleted = members.every((member) => {
        const completedLessons = completedByMember.get(member.id) ?? 0;
        return completedLessons >= targetLessons;
      });

      if (allCompleted && plan.status === "active") {
        await db
          .update(learningPlans)
          .set({
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(learningPlans.id, planId));
      }
    }
  }
}

async function refreshPlanLessonCounts(planId: string) {
  const [counts] = await db
    .select({
      totalLessons: sql<number>`count(*)::int`,
      completedLessons: sql<number>`count(*) filter (where ${learningPlanLessons.status} = 'completed')::int`,
    })
    .from(learningPlanLessons)
    .where(eq(learningPlanLessons.planId, planId));

  await db
    .update(learningPlans)
    .set({
      totalLessons: counts?.totalLessons ?? 0,
      completedLessons: counts?.completedLessons ?? 0,
      updatedAt: new Date(),
    })
    .where(eq(learningPlans.id, planId));
}

async function getAccessiblePlan(planId: string, userId: string) {
  const [plan] = await db
    .select()
    .from(learningPlans)
    .where(
      and(
        eq(learningPlans.id, planId),
        or(
          eq(learningPlans.expertId, userId),
          sql`exists (
            select 1
            from ${learningPlanMembers} lpm
            where lpm.plan_id = ${learningPlans.id}
              and lpm.user_id = ${userId}::uuid
              and lpm.status <> 'removed'
          )`
        )
      )
    )
    .limit(1);

  return plan ?? null;
}

async function getOwnedPlan(planId: string, expertId: string) {
  const [plan] = await db
    .select()
    .from(learningPlans)
    .where(and(eq(learningPlans.id, planId), eq(learningPlans.expertId, expertId)))
    .limit(1);

  return plan ?? null;
}

async function syncLegacyPrimaryLearner(planId: string) {
  const [firstMember] = await db
    .select({ userId: learningPlanMembers.userId })
    .from(learningPlanMembers)
    .where(and(eq(learningPlanMembers.planId, planId), ne(learningPlanMembers.status, "removed")))
    .orderBy(asc(learningPlanMembers.joinedAt), asc(learningPlanMembers.createdAt))
    .limit(1);

  await db
    .update(learningPlans)
    .set({
      learnerId: firstMember?.userId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(learningPlans.id, planId));
}

export async function listLearningPlansForUser(userId: string) {
  return db
    .select({
      id: learningPlans.id,
      title: learningPlans.title,
      description: learningPlans.description,
      goal: learningPlans.goal,
      status: learningPlans.status,
      completionMode: learningPlans.completionMode,
      requiredLessonCount: learningPlans.requiredLessonCount,
      endsAt: learningPlans.endsAt,
      visibility: learningPlans.visibility,
      totalLessons: learningPlans.totalLessons,
      completedLessons: sql<number>`case
        when ${learningPlans.expertId} = ${userId}::uuid then (
          select count(distinct lpp.lesson_id)::int
          from ${learningPlanLessonProgress} lpp
          inner join ${learningPlanMembers} lpm on lpm.id = lpp.plan_member_id
          where lpm.plan_id = ${learningPlans.id}
            and lpm.status <> 'removed'
            and lpp.status = 'completed'
        )
        else (
          select count(*)::int
          from ${learningPlanLessonProgress} lpp
          inner join ${learningPlanMembers} lpm on lpm.id = lpp.plan_member_id
          where lpm.plan_id = ${learningPlans.id}
            and lpm.user_id = ${userId}::uuid
            and lpm.status <> 'removed'
            and lpp.status = 'completed'
        )
      end`,
      createdAt: learningPlans.createdAt,
      updatedAt: learningPlans.updatedAt,
      learnerId: learningPlans.learnerId,
      expertId: learningPlans.expertId,
      topicName: topics.name,
      memberCount: sql<number>`(
        select count(*)::int
        from ${learningPlanMembers} lpm
        where lpm.plan_id = ${learningPlans.id}
          and lpm.status <> 'removed'
      )`,
      activeMemberCount: sql<number>`(
        select count(*)::int
        from ${learningPlanMembers} lpm
        where lpm.plan_id = ${learningPlans.id}
          and lpm.status = 'active'
      )`,
      myMemberStatus: sql<string | null>`(
        select lpm.status::text
        from ${learningPlanMembers} lpm
        where lpm.plan_id = ${learningPlans.id}
          and lpm.user_id = ${userId}::uuid
        limit 1
      )`,
    })
    .from(learningPlans)
    .leftJoin(topics, eq(learningPlans.topicId, topics.id))
    .where(
      or(
        eq(learningPlans.expertId, userId),
        sql`exists (
          select 1
          from ${learningPlanMembers} lpm
          where lpm.plan_id = ${learningPlans.id}
            and lpm.user_id = ${userId}::uuid
            and lpm.status <> 'removed'
        )`
      )
    )
    .orderBy(desc(learningPlans.updatedAt));
}

export async function getLearningPlanForUser(planId: string, userId: string) {
  const plan = await getAccessiblePlan(planId, userId);
  if (!plan) {
    return null;
  }

  const [lessons, resources, members, progressRows, topicRows] = await Promise.all([
    db
      .select()
      .from(learningPlanLessons)
      .where(eq(learningPlanLessons.planId, planId))
      .orderBy(asc(learningPlanLessons.position), asc(learningPlanLessons.createdAt)),
    db
      .select()
      .from(learningResources)
      .where(eq(learningResources.planId, planId))
      .orderBy(desc(learningResources.createdAt)),
    db
      .select({
        id: learningPlanMembers.id,
        userId: learningPlanMembers.userId,
        status: learningPlanMembers.status,
        role: learningPlanMembers.role,
        addedBy: learningPlanMembers.addedBy,
        joinedAt: learningPlanMembers.joinedAt,
        completedAt: learningPlanMembers.completedAt,
        createdAt: learningPlanMembers.createdAt,
        updatedAt: learningPlanMembers.updatedAt,
        displayName: users.displayName,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(learningPlanMembers)
      .innerJoin(users, eq(learningPlanMembers.userId, users.id))
      .where(eq(learningPlanMembers.planId, planId))
      .orderBy(asc(learningPlanMembers.joinedAt), asc(learningPlanMembers.createdAt)),
    db
      .select({
        id: learningPlanLessonProgress.id,
        planMemberId: learningPlanLessonProgress.planMemberId,
        lessonId: learningPlanLessonProgress.lessonId,
        status: learningPlanLessonProgress.status,
        notes: learningPlanLessonProgress.notes,
        completedAt: learningPlanLessonProgress.completedAt,
        updatedAt: learningPlanLessonProgress.updatedAt,
      })
      .from(learningPlanLessonProgress)
      .innerJoin(learningPlanMembers, eq(learningPlanLessonProgress.planMemberId, learningPlanMembers.id))
      .where(eq(learningPlanMembers.planId, planId))
      .orderBy(desc(learningPlanLessonProgress.updatedAt)),
    plan.topicId
      ? db
          .select({ id: topics.id, name: topics.name, slug: topics.slug })
          .from(topics)
          .where(eq(topics.id, plan.topicId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const activeMembers = members.filter((member) => member.status !== "removed");
  const myMembership = activeMembers.find((member) => member.userId === userId) ?? null;

  const activeMemberIds = new Set(activeMembers.map((member) => member.id));

  const memberProgressSummary = activeMembers.map((member) => {
    const progress = progressRows.filter((row) => row.planMemberId === member.id);
    const completed = progress.filter((row) => row.status === "completed").length;
    return {
      memberId: member.id,
      userId: member.userId,
      completedLessons: completed,
      totalTrackedLessons: lessons.length,
      progress,
    };
  });

  const lessonProgressSummary = lessons.map((lesson) => {
    const lessonProgress = progressRows.filter((row) => row.lessonId === lesson.id && activeMemberIds.has(row.planMemberId));
    const statusCounts = {
      completed: 0,
      in_progress: 0,
      missed: 0,
      not_started: 0,
    };

    for (const row of lessonProgress) {
      if (row.status in statusCounts) {
        statusCounts[row.status as keyof typeof statusCounts] += 1;
      }
    }

    return {
      lessonId: lesson.id,
      completedCount: statusCounts.completed,
      inProgressCount: statusCounts.in_progress,
      missedCount: statusCounts.missed,
      notStartedCount: Math.max(activeMembers.length - lessonProgress.length, 0) + statusCounts.not_started,
      progress: activeMembers
        .map((member) => {
          const memberProgress = lessonProgress.find((row) => row.planMemberId === member.id) ?? null;
          return {
            memberId: member.id,
            userId: member.userId,
            displayName: member.displayName,
            status: memberProgress?.status ?? "not_started",
            notes: memberProgress?.notes ?? null,
            completedAt: memberProgress?.completedAt ?? null,
          };
        }),
    };
  });

  return {
    ...plan,
    topic: topicRows[0] ?? null,
    memberCount: activeMembers.length,
    activeMemberCount: members.filter((member) => member.status === "active").length,
    lessons,
    resources,
    members,
    myMembership,
    progress: progressRows,
    memberProgressSummary,
    lessonProgressSummary,
  };
}

export async function createLearningPlan(input: {
  expertId: string;
  topicId?: string | null;
  title: string;
  description?: string | null;
  goal?: string | null;
  status?: "draft" | "active" | "completed" | "archived";
  completionMode?: "fixed_curriculum" | "ongoing_path";
  requiredLessonCount?: number | null;
  endsAt?: string | Date | null;
  visibility?: "private" | "invite_only" | "public";
  learnerId?: string | null;
  learnerIds?: string[];
}) {
  const learnerIds = Array.from(
    new Set(
      [input.learnerId, ...(input.learnerIds ?? [])].filter((value): value is string => Boolean(value))
    )
  ).filter((id) => id !== input.expertId);

  const [plan] = await db
    .insert(learningPlans)
    .values({
      learnerId: learnerIds[0] ?? null,
      expertId: input.expertId,
      topicId: input.topicId ?? null,
      title: input.title.trim(),
      description: normalizeNullable(input.description),
      goal: normalizeNullable(input.goal),
      status: input.status ?? "draft",
      completionMode: input.completionMode ?? "fixed_curriculum",
      requiredLessonCount: normalizeRequiredLessonCount(input.requiredLessonCount) ?? null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      visibility: input.visibility ?? "private",
    })
    .returning();

  if (learnerIds.length > 0) {
    await addMembersToLearningPlan(plan.id, input.expertId, learnerIds, plan.status === "active" ? "active" : "invited");
  }

  return plan;
}

export async function updateLearningPlan(planId: string, userId: string, input: {
  title?: string;
  description?: string | null;
  goal?: string | null;
  status?: "draft" | "active" | "completed" | "archived";
  completionMode?: "fixed_curriculum" | "ongoing_path";
  requiredLessonCount?: number | null;
  endsAt?: string | null;
  topicId?: string | null;
  visibility?: "private" | "invite_only" | "public";
}) {
  const existing = await getOwnedPlan(planId, userId);
  if (!existing) {
    throw new Error("Learning plan not found.");
  }

  const [plan] = await db
    .update(learningPlans)
    .set({
      title: input.title?.trim() || existing.title,
      description: input.description === undefined ? existing.description : normalizeNullable(input.description),
      goal: input.goal === undefined ? existing.goal : normalizeNullable(input.goal),
      status: input.status ?? existing.status,
      completionMode: input.completionMode ?? existing.completionMode,
      requiredLessonCount: input.requiredLessonCount === undefined
        ? existing.requiredLessonCount
        : normalizeRequiredLessonCount(input.requiredLessonCount),
      endsAt: input.endsAt === undefined
        ? existing.endsAt
        : input.endsAt
          ? new Date(input.endsAt)
          : null,
      topicId: input.topicId === undefined ? existing.topicId : input.topicId,
      visibility: input.visibility ?? existing.visibility,
      updatedAt: new Date(),
    })
    .where(eq(learningPlans.id, planId))
    .returning();

  if (input.status === undefined) {
    await syncPlanCompletionState(planId);
  }

  return plan;
}

export async function addMembersToLearningPlan(
  planId: string,
  expertUserId: string,
  learnerIds: string[],
  defaultStatus: "invited" | "active" = "invited"
) {
  const plan = await getOwnedPlan(planId, expertUserId);
  if (!plan) {
    throw new Error("Learning plan not found.");
  }

  if (plan.status === "completed" || plan.status === "archived") {
    throw new Error("You cannot add learners to a completed or archived plan.");
  }

  const uniqueLearnerIds = Array.from(new Set(learnerIds.filter((id) => id && id !== expertUserId)));
  if (uniqueLearnerIds.length === 0) {
    return [];
  }

  const learners = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, uniqueLearnerIds), eq(users.isSuspended, false)));

  if (learners.length !== uniqueLearnerIds.length) {
    throw new Error("One or more learners could not be added.");
  }

  const rows = await db
    .insert(learningPlanMembers)
    .values(
      uniqueLearnerIds.map((learnerId) => ({
        planId,
        userId: learnerId,
        addedBy: expertUserId,
        role: "learner" as const,
        status: defaultStatus,
        joinedAt: new Date(),
        updatedAt: new Date(),
      }))
    )
    .onConflictDoUpdate({
      target: [learningPlanMembers.planId, learningPlanMembers.userId],
      set: {
        status: defaultStatus,
        updatedAt: new Date(),
        completedAt: null,
      },
    })
    .returning();

  await syncLegacyPrimaryLearner(planId);

  return rows;
}

export async function updateLearningPlanMemberStatus(params: {
  planId: string;
  memberId: string;
  expertUserId: string;
  status: "invited" | "active" | "removed" | "completed";
}) {
  const { planId, memberId, expertUserId, status } = params;
  const plan = await getOwnedPlan(planId, expertUserId);
  if (!plan) {
    throw new Error("Learning plan not found.");
  }

  const [member] = await db
    .select()
    .from(learningPlanMembers)
    .where(and(eq(learningPlanMembers.id, memberId), eq(learningPlanMembers.planId, planId)))
    .limit(1);

  if (!member) {
    throw new Error("Plan member not found.");
  }

  const [updated] = await db
    .update(learningPlanMembers)
    .set({
      status,
      completedAt: status === "completed" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(learningPlanMembers.id, memberId))
    .returning();

  await syncLegacyPrimaryLearner(planId);

  return updated;
}

export async function createLesson(planId: string, userId: string, input: {
  title: string;
  summary?: string | null;
  objective?: string | null;
  status?: "planned" | "published" | "completed";
  scheduledAt?: string | null;
  durationMinutes?: number | null;
}) {
  const plan = await getOwnedPlan(planId, userId);
  if (!plan) {
    throw new Error("Only the assigned expert can add lessons.");
  }
  if (plan.status === "completed" && plan.completionMode === "fixed_curriculum") {
    throw new Error("Reopen this fixed plan before adding more lessons.");
  }

  const [positionRow] = await db
    .select({ nextPosition: sql<number>`coalesce(max(${learningPlanLessons.position}), 0) + 1` })
    .from(learningPlanLessons)
    .where(eq(learningPlanLessons.planId, planId));

  const [lesson] = await db
    .insert(learningPlanLessons)
    .values({
      planId,
      title: input.title.trim(),
      summary: normalizeNullable(input.summary),
      objective: normalizeNullable(input.objective),
      status: input.status ?? "planned",
      position: positionRow?.nextPosition ?? 1,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      durationMinutes: input.durationMinutes ?? null,
    })
    .returning();

  await refreshPlanLessonCounts(planId);
  await syncPlanCompletionState(planId);

  return lesson;
}

export async function updateLesson(planId: string, lessonId: string, userId: string, input: {
  title?: string;
  summary?: string | null;
  objective?: string | null;
  status?: "planned" | "published" | "completed";
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  position?: number;
}) {
  const plan = await getOwnedPlan(planId, userId);
  if (!plan) {
    throw new Error("Only the assigned expert can update lessons.");
  }
  if (plan.status === "completed" && plan.completionMode === "fixed_curriculum") {
    throw new Error("Reopen this fixed plan before editing lessons.");
  }

  const [existing] = await db
    .select()
    .from(learningPlanLessons)
    .where(and(eq(learningPlanLessons.id, lessonId), eq(learningPlanLessons.planId, planId)))
    .limit(1);

  if (!existing) {
    throw new Error("Lesson not found.");
  }

  const [lesson] = await db
    .update(learningPlanLessons)
    .set({
      title: input.title?.trim() || existing.title,
      summary: input.summary === undefined ? existing.summary : normalizeNullable(input.summary),
      objective: input.objective === undefined ? existing.objective : normalizeNullable(input.objective),
      status: input.status ?? existing.status,
      scheduledAt: input.scheduledAt === undefined
        ? existing.scheduledAt
        : input.scheduledAt
          ? new Date(input.scheduledAt)
          : null,
      durationMinutes: input.durationMinutes === undefined ? existing.durationMinutes : input.durationMinutes,
      position: input.position ?? existing.position,
      updatedAt: new Date(),
    })
    .where(eq(learningPlanLessons.id, lessonId))
    .returning();

  await refreshPlanLessonCounts(planId);
  await syncPlanCompletionState(planId);

  return lesson;
}

export async function upsertLessonProgress(params: {
  planId: string;
  lessonId: string;
  actorUserId: string;
  planMemberId?: string | null;
  learnerUserId?: string | null;
  status: "not_started" | "in_progress" | "missed" | "completed";
  notes?: string | null;
}) {
  const { planId, lessonId, actorUserId, planMemberId, learnerUserId, status, notes } = params;
  const accessiblePlan = await getAccessiblePlan(planId, actorUserId);
  if (!accessiblePlan) {
    throw new Error("Learning plan not found.");
  }

  const isExpert = accessiblePlan.expertId === actorUserId;

  let member;
  if (planMemberId) {
    [member] = await db
      .select()
      .from(learningPlanMembers)
      .where(and(eq(learningPlanMembers.id, planMemberId), eq(learningPlanMembers.planId, planId)))
      .limit(1);
  } else {
    const targetUserId = isExpert ? learnerUserId : actorUserId;
    if (!targetUserId) {
      throw new Error("A learner must be selected for progress updates.");
    }
    [member] = await db
      .select()
      .from(learningPlanMembers)
      .where(and(eq(learningPlanMembers.planId, planId), eq(learningPlanMembers.userId, targetUserId)))
      .limit(1);
  }

  if (!member) {
    throw new Error("Plan member not found.");
  }

  if (!isExpert && member.userId !== actorUserId) {
    throw new Error("You can only update your own progress.");
  }

  const [lesson] = await db
    .select()
    .from(learningPlanLessons)
    .where(and(eq(learningPlanLessons.id, lessonId), eq(learningPlanLessons.planId, planId)))
    .limit(1);

  if (!lesson) {
    throw new Error("Lesson not found.");
  }

  const normalizedNotes = normalizeNullable(notes);
  const writeProgress = async (progressStatus: "not_started" | "in_progress" | "missed" | "completed", progressNotes: string | null) =>
    db
      .insert(learningPlanLessonProgress)
      .values({
        planMemberId: member.id,
        lessonId,
        status: progressStatus,
        notes: progressNotes,
        completedAt: progressStatus === "completed" ? new Date() : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [learningPlanLessonProgress.planMemberId, learningPlanLessonProgress.lessonId],
        set: {
          status: progressStatus,
          notes: progressNotes,
          completedAt: progressStatus === "completed" ? new Date() : null,
          updatedAt: new Date(),
        },
      })
      .returning();

  let progress;
  try {
    [progress] = await writeProgress(status, normalizedNotes);
  } catch (error) {
    const isMissingEnumValue =
      status === "missed" &&
      typeof error === "object" &&
      error !== null &&
      "cause" in error &&
      typeof error.cause === "object" &&
      error.cause !== null &&
      "code" in error.cause &&
      error.cause.code === "22P02";

    if (!isMissingEnumValue) {
      throw error;
    }

    const fallbackNotes = normalizedNotes
      ? `${normalizedNotes} [legacy-missed-fallback]`
      : "Learner missed this lesson. [legacy-missed-fallback]";

    [progress] = await writeProgress("not_started", fallbackNotes);
  }

  await syncPlanCompletionState(planId);

  return progress;
}

export async function addPlanResource(planId: string, userId: string, input: {
  lessonId?: string | null;
  sessionArchiveId?: string | null;
  roomId?: string | null;
  type?: "doc" | "link" | "recording" | "note" | "file";
  title: string;
  description?: string | null;
  url?: string | null;
  content?: string | null;
}) {
  const plan = await getAccessiblePlan(planId, userId);
  if (!plan) {
    throw new Error("Learning plan not found.");
  }

  const [resource] = await db
    .insert(learningResources)
    .values({
      planId,
      lessonId: input.lessonId ?? null,
      sessionArchiveId: input.sessionArchiveId ?? null,
      roomId: input.roomId ?? null,
      uploadedBy: userId,
      type: input.type ?? "doc",
      title: input.title.trim(),
      description: normalizeNullable(input.description),
      url: normalizeNullable(input.url),
      content: normalizeNullable(input.content),
    })
    .returning();

  return resource;
}
