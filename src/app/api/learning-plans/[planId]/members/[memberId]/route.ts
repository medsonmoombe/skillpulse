import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/currentUser";
import { updateLearningPlanMemberStatus } from "@/lib/learning-plans";

const updateMemberSchema = z.object({
  status: z.enum(["invited", "active", "removed", "completed"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ planId: string; memberId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = updateMemberSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid member update payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { planId, memberId } = await context.params;
    const member = await updateLearningPlanMemberStatus({
      planId,
      memberId,
      expertUserId: user.id,
      status: parsed.data.status,
    });
    return NextResponse.json({ member });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update plan member" }, { status: 400 });
  }
}
