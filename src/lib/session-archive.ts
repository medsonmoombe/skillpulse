import { db, withRetry } from "@/db";
import { learningPlanMembers, learningResources, roomBookings, sessionArchives, users } from "@/db/schema";
import { and, desc, eq, ne, or } from "drizzle-orm";

type SessionArchiveSummary = {
  totalElements: number;
  textSnippets: string[];
  shapeCount: number;
};

export async function archiveRoomSession(input: {
  roomId: string;
  hostId: string;
  planId?: string | null;
  lessonId?: string | null;
  title: string;
  skillLevel?: string | null;
  agenda?: string[] | null;
  notes?: Record<string, unknown> | null;
  startedAt?: Date | null;
  endedAt: Date;
  summary: SessionArchiveSummary;
  boardImageDataUrl?: string | null;
  recordingUrl?: string | null;
}) {
  const [archive] = await db
    .insert(sessionArchives)
    .values({
      roomId: input.roomId,
      planId: input.planId ?? null,
      lessonId: input.lessonId ?? null,
      hostId: input.hostId,
      title: input.title,
      recordingUrl: input.recordingUrl ?? null,
      boardImageDataUrl: input.boardImageDataUrl ?? null,
      summary: input.summary,
      skillLevel: input.skillLevel ?? null,
      agenda: input.agenda ?? [],
      notes: input.notes ?? {},
      startedAt: input.startedAt ?? null,
      endedAt: input.endedAt,
    })
    .onConflictDoUpdate({
      target: sessionArchives.roomId,
      set: {
        planId: input.planId ?? null,
        lessonId: input.lessonId ?? null,
        title: input.title,
        recordingUrl: input.recordingUrl ?? null,
        boardImageDataUrl: input.boardImageDataUrl ?? null,
        summary: input.summary,
        skillLevel: input.skillLevel ?? null,
        agenda: input.agenda ?? [],
        notes: input.notes ?? {},
        startedAt: input.startedAt ?? null,
        endedAt: input.endedAt,
      },
    })
    .returning();

  if (input.boardImageDataUrl) {
    const [existingResource] = await db
      .select({ id: learningResources.id })
      .from(learningResources)
      .where(
        and(
          eq(learningResources.sessionArchiveId, archive.id),
          eq(learningResources.roomId, input.roomId),
          eq(learningResources.title, `${input.title} board recap`)
        )
      )
      .limit(1);

    if (!existingResource) {
      await db.insert(learningResources).values({
        sessionArchiveId: archive.id,
        roomId: input.roomId,
        uploadedBy: input.hostId,
        type: "recording",
        title: `${input.title} board recap`,
        description: "Automatically captured session board summary.",
        content: input.summary.textSnippets.join("\n"),
      });
    }
  }

  return archive;
}

export async function listSessionHistoryForUser(userId: string) {
  return withRetry(() => db
    .selectDistinct({
      id: sessionArchives.id,
      roomId: sessionArchives.roomId,
      title: sessionArchives.title,
      hostId: sessionArchives.hostId,
      hostName: users.displayName,
      recordingUrl: sessionArchives.recordingUrl,
      summary: sessionArchives.summary,
      skillLevel: sessionArchives.skillLevel,
      agenda: sessionArchives.agenda,
      endedAt: sessionArchives.endedAt,
      createdAt: sessionArchives.createdAt,
    })
    .from(sessionArchives)
    .innerJoin(users, eq(sessionArchives.hostId, users.id))
    .leftJoin(roomBookings, eq(roomBookings.roomId, sessionArchives.roomId))
    .leftJoin(learningPlanMembers, eq(learningPlanMembers.planId, sessionArchives.planId))
    .where(
      or(
        eq(sessionArchives.hostId, userId),
        eq(roomBookings.userId, userId),
        and(eq(learningPlanMembers.userId, userId), ne(learningPlanMembers.status, "removed"))
      )
    )
    .orderBy(desc(sessionArchives.endedAt))
  );
}

export async function getSessionArchiveForUser(archiveId: string, userId: string) {
  const [archive] = await db
    .select({
      id: sessionArchives.id,
      roomId: sessionArchives.roomId,
      title: sessionArchives.title,
      hostId: sessionArchives.hostId,
      recordingUrl: sessionArchives.recordingUrl,
      boardImageDataUrl: sessionArchives.boardImageDataUrl,
      summary: sessionArchives.summary,
      skillLevel: sessionArchives.skillLevel,
      agenda: sessionArchives.agenda,
      notes: sessionArchives.notes,
      endedAt: sessionArchives.endedAt,
      createdAt: sessionArchives.createdAt,
    })
    .from(sessionArchives)
    .leftJoin(roomBookings, eq(roomBookings.roomId, sessionArchives.roomId))
    .leftJoin(learningPlanMembers, eq(learningPlanMembers.planId, sessionArchives.planId))
    .where(
      and(
        eq(sessionArchives.id, archiveId),
        or(
          eq(sessionArchives.hostId, userId),
          eq(roomBookings.userId, userId),
          and(eq(learningPlanMembers.userId, userId), ne(learningPlanMembers.status, "removed"))
        )
      )
    )
    .limit(1);

  if (!archive) {
    return null;
  }

  const resources = await db
    .select()
    .from(learningResources)
    .where(eq(learningResources.sessionArchiveId, archiveId))
    .orderBy(desc(learningResources.createdAt));

  return {
    ...archive,
    resources,
  };
}

export async function updateSessionArchiveForHost(archiveId: string, hostId: string, input: {
  recordingUrl?: string | null;
  boardImageDataUrl?: string | null;
  notes?: Record<string, unknown> | null;
}) {
  const [archive] = await db
    .select()
    .from(sessionArchives)
    .where(and(eq(sessionArchives.id, archiveId), eq(sessionArchives.hostId, hostId)))
    .limit(1);

  if (!archive) {
    throw new Error("Session archive not found.");
  }

  const [updated] = await db
    .update(sessionArchives)
    .set({
      recordingUrl: input.recordingUrl === undefined ? archive.recordingUrl : input.recordingUrl,
      boardImageDataUrl: input.boardImageDataUrl === undefined ? archive.boardImageDataUrl : input.boardImageDataUrl,
      notes: input.notes === undefined ? archive.notes : input.notes ?? {},
    })
    .where(eq(sessionArchives.id, archiveId))
    .returning();

  return updated;
}
