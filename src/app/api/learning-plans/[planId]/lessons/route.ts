import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/currentUser";
import { createLesson } from "@/lib/learning-plans";

const optionalScheduledAt = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
      return `${trimmed}:00`;
    }
    return trimmed;
  }
  return value;
}, z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), {
  message: "Invalid ISO datetime",
}).nullable().optional());

const createLessonSchema = z.object({
  title: z.string().trim().min(2).max(160),
  summary: z.string().trim().max(5000).nullable().optional(),
  objective: z.string().trim().max(5000).nullable().optional(),
  status: z.enum(["planned", "published", "completed"]).optional(),
  scheduledAt: optionalScheduledAt,
  durationMinutes: z.number().int().positive().max(1440).nullable().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ planId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createLessonSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid lesson payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { planId } = await context.params;
    const lesson = await createLesson(planId, user.id, parsed.data);
    return NextResponse.json({ lesson }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create lesson" }, { status: 400 });
  }
}
