import { db, withRetry } from "@/db";
import { creditTransactions, creditWallets } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const DEMO_STARTING_CREDITS = 1000;

async function ensureDemoWalletForUserInner(userId: string) {
  const [existingWallet] = await db
    .select()
    .from(creditWallets)
    .where(eq(creditWallets.userId, userId))
    .limit(1);

  if (existingWallet) {
    return existingWallet;
  }

  const now = new Date();
  const [wallet] = await db
    .insert(creditWallets)
    .values({
      userId,
      balance: DEMO_STARTING_CREDITS,
      bonusGrantedAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: creditWallets.userId })
    .returning();

  const resolvedWallet = wallet ?? (await db
    .select()
    .from(creditWallets)
    .where(eq(creditWallets.userId, userId))
    .limit(1))[0];

  if (!resolvedWallet) {
    throw new Error("Unable to initialize demo wallet.");
  }

  const [existingBonus] = await db
    .select({ id: creditTransactions.id })
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .limit(1);

  if (!existingBonus) {
    await db.insert(creditTransactions).values({
      userId,
      type: "bonus",
      direction: "credit",
      amount: DEMO_STARTING_CREDITS,
      paymentMethod: "bonus_credits",
      description: "Starter demo credits",
      metadata: { source: "wallet_bootstrap" },
    });
  }

  return resolvedWallet;
}

export async function ensureDemoWalletForUser(userId: string) {
  return withRetry(() => ensureDemoWalletForUserInner(userId));
}

export async function getWalletSnapshot(userId: string) {
  const wallet = await ensureDemoWalletForUser(userId);
  const recentTransactions = await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(20);

  return {
    wallet,
    recentTransactions,
  };
}
