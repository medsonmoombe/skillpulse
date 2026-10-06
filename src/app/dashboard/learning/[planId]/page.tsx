import { getCurrentUser } from "@/lib/currentUser";
import { redirect, notFound } from "next/navigation";
import { getLearningPlanForUser } from "@/lib/learning-plans";
import { PlanDetailClient } from "./PlanDetailClient";

export default async function LearningPlanDetailPage({
  params,
}: { params: Promise<{ planId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const { planId } = await params;
  const plan = await getLearningPlanForUser(planId, user.id);
  if (!plan) notFound();
  return <PlanDetailClient plan={plan} userId={user.id} userRole={user.role} />;
}
