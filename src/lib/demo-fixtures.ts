import { db } from "@/db";
import {
  creditTransactions,
  creditWallets,
  learningPlanMembers,
  roomBookings,
  rooms,
  users,
} from "@/db/schema";
import { and, asc, eq, ne } from "drizzle-orm";
import { addPlanResource, createLearningPlan, createLesson, upsertLessonProgress } from "@/lib/learning-plans";
import { ensureDemoWalletForUser } from "@/lib/demo-wallet";
import { reserveRoomSpotTransactional } from "@/lib/room-booking";
import { archiveRoomSession } from "@/lib/session-archive";

type CurrentUserLike = {
  id: string;
  role: "learner" | "expert";
  displayName: string;
};

export async function grantDemoCredits(params: {
  userId: string;
  amount: number;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  const { userId, amount, description, metadata } = params;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Credit amount must be a positive number.");
  }

  await ensureDemoWalletForUser(userId);

  return db.transaction(async (tx) => {
    const [wallet] = await tx
      .select()
      .from(creditWallets)
      .where(eq(creditWallets.userId, userId))
      .limit(1);

    if (!wallet) {
      throw new Error("Wallet not found.");
    }

    const nextBalance = wallet.balance + Math.floor(amount);
    const now = new Date();

    await tx
      .update(creditWallets)
      .set({
        balance: nextBalance,
        updatedAt: now,
      })
      .where(eq(creditWallets.id, wallet.id));

    const [transaction] = await tx
      .insert(creditTransactions)
      .values({
        userId,
        type: "manual_adjustment",
        direction: "credit",
        amount: Math.floor(amount),
        paymentMethod: "bonus_credits",
        description: description ?? "Demo credit top-up",
        metadata: metadata ?? { source: "demo_top_up" },
      })
      .returning();

    return {
      balance: nextBalance,
      transaction,
    };
  });
}

async function pickDemoPartner(currentUser: CurrentUserLike) {
  const preferredRole = currentUser.role === "learner" ? "expert" : "learner";

  const [preferredPartner] = await db
    .select({
      id: users.id,
      role: users.role,
      displayName: users.displayName,
    })
    .from(users)
    .where(and(ne(users.id, currentUser.id), eq(users.role, preferredRole), eq(users.isSuspended, false)))
    .orderBy(asc(users.createdAt))
    .limit(1);

  if (preferredPartner) {
    return preferredPartner;
  }

  const [fallbackPartner] = await db
    .select({
      id: users.id,
      role: users.role,
      displayName: users.displayName,
    })
    .from(users)
    .where(and(ne(users.id, currentUser.id), eq(users.isSuspended, false)))
    .orderBy(asc(users.createdAt))
    .limit(1);

  return fallbackPartner ?? currentUser;
}

export async function bootstrapDemoWorkspace(currentUser: CurrentUserLike) {
  const partner = await pickDemoPartner(currentUser);
  const expertUser = currentUser.role === "expert"
    ? currentUser
    : partner.role === "expert"
      ? partner
      : currentUser;
  const learnerUser = currentUser.role === "learner"
    ? currentUser
    : partner.role === "learner"
      ? partner
      : currentUser;
  const selfPaired = expertUser.id === learnerUser.id;

  await Promise.all([
    ensureDemoWalletForUser(currentUser.id),
    ensureDemoWalletForUser(expertUser.id),
    ensureDemoWalletForUser(learnerUser.id),
  ]);

  const topUpResult = await grantDemoCredits({
    userId: currentUser.id,
    amount: 4000,
    description: "Demo workspace bootstrap credits",
    metadata: { source: "demo_bootstrap" },
  });

  const plan = await createLearningPlan({
    expertId: expertUser.id,
    learnerIds: [learnerUser.id],
    title: `Demo learning plan for ${learnerUser.displayName}`,
    description: "A seeded plan for testing structured learning flows.",
    goal: "Complete a practical mentorship journey with lessons, resources, and archived sessions.",
    status: "active",
    visibility: "invite_only",
  });

  const [lessonOne, lessonTwo, lessonThree] = await Promise.all([
    createLesson(plan.id, expertUser.id, {
      title: "Kickoff and skill baseline",
      summary: "Understand goals, current gaps, and create the learning path.",
      objective: "Align on the learner's target outcome.",
      status: "published",
      durationMinutes: 45,
    }),
    createLesson(plan.id, expertUser.id, {
      title: "Hands-on guided session",
      summary: "Work through a real example together.",
      objective: "Turn theory into practice.",
      status: "published",
      durationMinutes: 60,
    }),
    createLesson(plan.id, expertUser.id, {
      title: "Review and next steps",
      summary: "Review progress and define the next milestone.",
      objective: "Lock in understanding and assign follow-up work.",
      status: "planned",
      durationMinutes: 30,
    }),
  ]);

  await Promise.all([
    addPlanResource(plan.id, expertUser.id, {
      lessonId: lessonOne.id,
      type: "doc",
      title: "Kickoff notes",
      description: "Shared notes for the first session.",
      content: "Goals, current skill level, blockers, and target milestone.",
    }),
    addPlanResource(plan.id, expertUser.id, {
      lessonId: lessonTwo.id,
      type: "link",
      title: "Practice reference",
      description: "Reference material for the hands-on session.",
      url: "https://example.com/demo-practice-reference",
    }),
  ]);

  const [planMember] = await db
    .select({ id: learningPlanMembers.id })
    .from(learningPlanMembers)
    .where(and(eq(learningPlanMembers.planId, plan.id), eq(learningPlanMembers.userId, learnerUser.id)))
    .limit(1);

  if (planMember) {
    await Promise.all([
      upsertLessonProgress({
        planId: plan.id,
        lessonId: lessonOne.id,
        actorUserId: expertUser.id,
        planMemberId: planMember.id,
        status: "completed",
        notes: "Seeded as completed to demonstrate per-learner progress.",
      }),
      upsertLessonProgress({
        planId: plan.id,
        lessonId: lessonTwo.id,
        actorUserId: expertUser.id,
        planMemberId: planMember.id,
        status: "in_progress",
        notes: "Seeded as in progress for demo purposes.",
      }),
    ]);
  }

  const [room] = await db
    .insert(rooms)
    .values({
      hostId: expertUser.id,
      planId: plan.id,
      lessonId: lessonTwo.id,
      title: `Demo session: ${lessonTwo.title}`,
      livekitRoomId: `demo-room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: "scheduled",
      sessionType: "lesson_live",
      countsTowardProgress: true,
      startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() - 60 * 60 * 1000),
      autoAdmit: true,
      priceCredits: selfPaired ? 0 : 250,
      agenda: [
        "Recap the previous lesson",
        "Solve one practical exercise together",
        "Capture action items for follow-up",
      ],
      skillLevel: "intermediate",
      sessionNotes: {
        planId: plan.id,
        lessonId: lessonTwo.id,
        seededBy: currentUser.id,
      },
      maxParticipants: 10,
    })
    .returning();

  let bookingId: string | null = null;

  if (!selfPaired) {
    const reservation = await reserveRoomSpotTransactional({
      roomId: room.id,
      userId: learnerUser.id,
      allowedStatuses: ["scheduled"],
      paymentMethod: "bonus_credits",
      priceCredits: room.priceCredits,
    });
    bookingId = reservation.bookingId;
  } else {
    const [booking] = await db
      .insert(roomBookings)
      .values({
        roomId: room.id,
        userId: learnerUser.id,
        status: "admitted",
        paidCredits: 0,
        paymentMethod: "bonus_credits",
      })
      .returning({ id: roomBookings.id });
    bookingId = booking.id;
  }

  await db
    .update(rooms)
    .set({ status: "ended" })
    .where(eq(rooms.id, room.id));

  const archive = await archiveRoomSession({
    roomId: room.id,
    hostId: expertUser.id,
    planId: plan.id,
    lessonId: lessonTwo.id,
    title: room.title,
    skillLevel: room.skillLevel,
    agenda: room.agenda,
    notes: {
      planId: plan.id,
      lessonId: lessonTwo.id,
      homework: [
        "Rebuild the exercise alone",
        "Write down two blockers to discuss next time",
      ],
      seededBy: currentUser.id,
    },
    startedAt: room.startsAt,
    endedAt: new Date(Date.now() - 50 * 60 * 1000),
    boardImageDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9oN9p9cAAAAASUVORK5CYII=",
    summary: {
      totalElements: 8,
      textSnippets: [
        "Goal: improve session structure",
        "Action item: practise before next call",
      ],
      shapeCount: 6,
    },
    recordingUrl: "https://example.com/demo-recording",
  });

  await addPlanResource(plan.id, expertUser.id, {
    lessonId: lessonTwo.id,
    sessionArchiveId: archive.id,
    roomId: room.id,
    type: "recording",
    title: "Session replay",
    description: "Seeded recording link for frontend testing.",
    url: "https://example.com/demo-recording",
  });

  await addPlanResource(plan.id, expertUser.id, {
    lessonId: lessonThree.id,
    sessionArchiveId: archive.id,
    roomId: room.id,
    type: "note",
    title: "Post-session summary",
    content: "Strong engagement, good questions, and clear next steps captured for the learner.",
  });

  return {
    planId: plan.id,
    lessonIds: [lessonOne.id, lessonTwo.id, lessonThree.id],
    archiveId: archive.id,
    roomId: room.id,
    bookingId,
    learnerId: learnerUser.id,
    expertId: expertUser.id,
    selfPaired,
    creditsAdded: topUpResult.transaction.amount,
    currentUserBalance: topUpResult.balance,
  };
}
