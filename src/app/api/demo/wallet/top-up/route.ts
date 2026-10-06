import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/currentUser";
import { grantDemoCredits } from "@/lib/demo-fixtures";

const topUpSchema = z.object({
  amount: z.number().int().positive().max(100000).default(1000),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = topUpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid top-up payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await grantDemoCredits({
      userId: user.id,
      amount: parsed.data.amount,
      description: "Manual demo wallet top-up",
      metadata: { source: "demo_wallet_route" },
    });

    return NextResponse.json({
      success: true,
      balance: result.balance,
      transaction: result.transaction,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to top up demo wallet" },
      { status: 400 }
    );
  }
}
