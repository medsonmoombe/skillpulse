import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { listLearningPlansForUser } from "@/lib/learning-plans";
import { LearningClient } from "./LearningClient";

export default async function LearningPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const plans = await listLearningPlansForUser(user.id);
  return <LearningClient plans={plans} userId={user.id} userRole={user.role} />;
}
