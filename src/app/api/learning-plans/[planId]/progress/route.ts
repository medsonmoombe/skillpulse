import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/currentUser";
import { upsertLessonProgress } from "@/lib/learning-plans";

const upsertProgressSchema = z.object({
  planMemberId: z.string().uuid().nullable().optional(),
  learnerUserId: z.string().uuid().nullable().optional(),
  lessonId: z.string().uuid(),
  status: z.enum(["not_started", "in_progress", "missed", "completed"]),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ planId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = upsertProgressSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid progress payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { planId } = await context.params;
    const progress = await upsertLessonProgress({
      planId,
      actorUserId: user.id,
      ...parsed.data,
    });
    return NextResponse.json({ progress }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update lesson progress" }, { status: 400 });
  }
}
