import { db } from "@/db";
import { groups } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { canUserManageGroup } from "@/lib/group-governance";
import { GroupEditForm } from "@/components/GroupEditForm";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function EditGroupPage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [group] = await db.select().from(groups).where(eq(groups.slug, slug));
  if (!group) notFound();

  const isAdmin = await canUserManageGroup(group.id, user.id);
  if (!isAdmin) redirect(`/dashboard/groups/${slug}`);

  return <GroupEditForm group={group} />;
}
