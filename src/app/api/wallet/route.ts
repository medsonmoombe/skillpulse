import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { getWalletSnapshot } from "@/lib/demo-wallet";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshot = await getWalletSnapshot(user.id);
  return NextResponse.json(snapshot);
}
