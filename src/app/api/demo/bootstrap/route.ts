import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { bootstrapDemoWorkspace } from "@/lib/demo-fixtures";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await bootstrapDemoWorkspace({
      id: user.id,
      role: user.role,
      displayName: user.displayName,
    });

    return NextResponse.json({
      success: true,
      message: "Demo workspace seeded successfully.",
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to seed demo workspace" },
      { status: 400 }
    );
  }
}
