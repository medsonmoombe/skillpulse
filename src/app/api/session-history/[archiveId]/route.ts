import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/currentUser";
import { getSessionArchiveForUser, updateSessionArchiveForHost } from "@/lib/session-archive";

const updateArchiveSchema = z.object({
  recordingUrl: z.string().trim().url().nullable().optional(),
  boardImageDataUrl: z.string().trim().nullable().optional(),
  notes: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ archiveId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { archiveId } = await context.params;
  const session = await getSessionArchiveForUser(archiveId, user.id);

  if (!session) {
    return NextResponse.json({ error: "Session history record not found" }, { status: 404 });
  }

  return NextResponse.json({ session });
}

export async function PATCH(request: Request, context: { params: Promise<{ archiveId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = updateArchiveSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid session archive update", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { archiveId } = await context.params;
    const session = await updateSessionArchiveForHost(archiveId, user.id, parsed.data);
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update session archive" }, { status: 400 });
  }
}
