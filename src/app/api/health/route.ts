import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  try {
    // Lightweight ping — no table scan
    await db.execute(sql`select 1`);
    const latencyMs = Date.now() - start;

    return NextResponse.json(
      { status: "ok", db: "connected", latencyMs },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: "degraded",
        db: "unreachable",
        error: err instanceof Error ? err.message : "Unknown error",
        latencyMs: Date.now() - start,
      },
      { status: 503 }
    );
  }
}
