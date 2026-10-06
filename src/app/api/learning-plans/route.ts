import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/currentUser";
import { createLearningPlan, listLearningPlansForUser } from "@/lib/learning-plans";

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

const createPlanSchema = z.object({
  expertId: z.string().uuid(),
  learnerId: z.string().uuid().nullable().optional(),
  learnerIds: z.array(z.string().uuid()).optional(),
  topicId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(5000).nullable().optional(),
  goal: z.string().trim().max(5000).nullable().optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
  completionMode: z.enum(["fixed_curriculum", "ongoing_path"]).optional(),
  requiredLessonCount: z.number().int().positive().nullable().optional(),
  endsAt: optionalEndsAt,
  visibility: z.enum(["private", "invite_only", "public"]).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await listLearningPlansForUser(user.id);
  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createPlanSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid learning plan payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  if (user.role !== "expert" || payload.expertId !== user.id) {
    return NextResponse.json({ error: "Only experts can create shared learning plans." }, { status: 403 });
  }

  const plan = await createLearningPlan(payload);
  return NextResponse.json({ plan }, { status: 201 });
}
