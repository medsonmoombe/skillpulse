import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { LiveLessonsClient } from "./LiveLessonsClient";

export default async function LiveLessonsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  
  return <LiveLessonsClient userId={user.id} userRole={user.role} />;
}
