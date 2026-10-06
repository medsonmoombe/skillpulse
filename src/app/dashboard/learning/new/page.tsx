import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { connections, users } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { NewPlanForm } from "./NewPlanForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewLearningPlanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "expert") redirect("/dashboard/learning");

  const connectedLearners = await db
    .select({ id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl })
    .from(connections)
    .innerJoin(
      users,
      or(
        and(eq(connections.requesterId, user.id), eq(users.id, connections.addresseeId)),
        and(eq(connections.addresseeId, user.id), eq(users.id, connections.requesterId))
      )
    )
    .where(
      and(
        or(eq(connections.requesterId, user.id), eq(connections.addresseeId, user.id)),
        eq(connections.status, "accepted"),
        eq(users.role, "learner")
      )
    );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard/learning" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft size={14} /> Learning Plans
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create Learning Plan</h1>
        <p className="mt-1 text-sm text-slate-500">Build a structured lesson journey for your learners.</p>
      </div>
      <NewPlanForm expertId={user.id} learners={connectedLearners} />
    </div>
  );
}
