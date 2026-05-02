import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import { createOrGetGroupConversation } from "@/lib/messaging";
import { getGroupBySlugWithGovernance, getGroupMembershipState } from "@/lib/group-governance";

type GroupChatPageProps = PageProps<"/dashboard/groups/[slug]/chat">;

export default async function GroupChatPage(props: GroupChatPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { slug } = await props.params;

  const group = await getGroupBySlugWithGovernance(slug);

  if (!group) {
    redirect("/dashboard/groups");
  }

  const membership = await getGroupMembershipState(group.id, user.id);

  if (!membership || membership.status !== "approved") {
    redirect(`/dashboard/groups/${slug}`);
  }

  const result = await createOrGetGroupConversation(user.id, group.id);

  if (!result.success || !result.conversationId) {
    redirect(`/dashboard/groups/${slug}`);
  }

  redirect(`/dashboard/messages/${result.conversationId}`);
}
