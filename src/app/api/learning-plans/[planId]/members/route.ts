import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/currentUser";
import { addMembersToLearningPlan } from "@/lib/learning-plans";

const addMembersSchema = z.object({
  learnerIds: z.array(z.string().uuid()).min(1),
  status: z.enum(["invited", "active"]).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ planId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = addMembersSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan members payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { planId } = await context.params;
    const members = await addMembersToLearningPlan(planId, user.id, parsed.data.learnerIds, parsed.data.status);
    return NextResponse.json({ members }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to add plan members" }, { status: 400 });
  }
}
