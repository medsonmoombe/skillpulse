import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/currentUser";
import { getLearningPlanForUser, updateLearningPlan } from "@/lib/learning-plans";

const optionalEndsAt = z.preprocess((value) => {
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

const updatePlanSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  goal: z.string().trim().max(5000).nullable().optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
  completionMode: z.enum(["fixed_curriculum", "ongoing_path"]).optional(),
  requiredLessonCount: z.number().int().positive().nullable().optional(),
  endsAt: optionalEndsAt,
  topicId: z.string().uuid().nullable().optional(),
  visibility: z.enum(["private", "invite_only", "public"]).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ planId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await context.params;
  const plan = await getLearningPlanForUser(planId, user.id);

  if (!plan) {
    return NextResponse.json({ error: "Learning plan not found" }, { status: 404 });
  }

  return NextResponse.json({ plan });
}

export async function PATCH(request: Request, context: { params: Promise<{ planId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = updatePlanSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid learning plan update", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { planId } = await context.params;
    const plan = await updateLearningPlan(planId, user.id, parsed.data);
    return NextResponse.json({ plan });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update learning plan" }, { status: 400 });
  }
}
