import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/currentUser";
import { addPlanResource } from "@/lib/learning-plans";

const addResourceSchema = z.object({
  lessonId: z.string().uuid().nullable().optional(),
  sessionArchiveId: z.string().uuid().nullable().optional(),
  roomId: z.string().uuid().nullable().optional(),
  type: z.enum(["doc", "link", "recording", "note", "file"]).optional(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(5000).nullable().optional(),
  url: z.string().trim().url().nullable().optional(),
  content: z.string().trim().max(20000).nullable().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ planId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = addResourceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid resource payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { planId } = await context.params;
    const resource = await addPlanResource(planId, user.id, parsed.data);
    return NextResponse.json({ resource }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to add resource" }, { status: 400 });
  }
}
