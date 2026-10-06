import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Crown, ShieldCheck, Users } from "lucide-react";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/currentUser";
import { getDirectMessageEligibility } from "@/lib/messaging";
import {
  canUserManageGroup,
  getGroupBySlugWithGovernance,
  getGroupMembershipState,
  listGroupMembers,
} from "@/lib/group-governance";
import { StartConversationButton } from "@/components/StartConversationButton";
import {
  ApproveMemberForm,
  RejectMemberForm,
  RemoveMemberForm,
  UpdateRoleForm,
} from "@/components/GroupAdminForms";

interface Props {
  params: Promise<{ slug: string }>;
}

const ROLE_CONFIG = {
  admin:     { label: "Admin",  color: "bg-indigo-100 text-indigo-700", icon: Crown       },
  moderator: { label: "Mod",    color: "bg-purple-100 text-purple-700", icon: ShieldCheck },
  member:    { label: "Member", color: "bg-slate-100 text-slate-600",   icon: Users       },
} as const;

export default async function GroupMembersPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/dashboard");

  const { slug } = await params;
  const group = await getGroupBySlugWithGovernance(slug);
  if (!group) notFound();

  const [membershipState, memberships, isAdmin] = await Promise.all([
    getGroupMembershipState(group.id, user.id),
    listGroupMembers(group.id),
    canUserManageGroup(group.id, user.id),
  ]);

  const isApprovedMember = membershipState?.status === "approved";

  const approvedMembers = memberships.filter((m) => m.status === "approved");
  const pendingMembers  = memberships.filter((m) => m.status === "pending");

  const sortedMembers = [...approvedMembers].sort((a, b) => {
    const order = { admin: 0, moderator: 1, member: 2 };
    if (a.userId === user.id) return -1;
    if (b.userId === user.id) return 1;
    return (order[a.role] ?? 3) - (order[b.role] ?? 3);
  });

  const otherIds = isApprovedMember
    ? Array.from(new Set(approvedMembers.map((m) => m.userId).filter((id) => id !== user.id)))
    : [];

  const memberEligibility = new Map(
    await Promise.all(
      otherIds.map(async (id) => [id, await getDirectMessageEligibility(user.id, id)] as const)
    )
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/groups/${slug}`}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{group.name}</h1>
          <p className="text-xs text-slate-500">{approvedMembers.length} member{approvedMembers.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Pending requests — admin only */}
      {isAdmin && pendingMembers.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-5 py-3">
            <Clock className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-amber-800">Join Requests</h2>
            <span className="ml-auto rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-800">
              {pendingMembers.length}
            </span>
          </div>
          <div className="divide-y divide-amber-50">
            {pendingMembers.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-white">
                  {m.avatar
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={m.avatar} alt="" className="h-full w-full object-cover" />
                    : m.name?.charAt(0).toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{m.name ?? "Unknown"}</p>
                  <p className="text-xs text-slate-500">Requesting to join</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <ApproveMemberForm groupId={group.id} targetUserId={m.userId} />
                  <RejectMemberForm  groupId={group.id} targetUserId={m.userId} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Member list */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          <Users className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900">Members</h2>
          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
            {approvedMembers.length}
          </span>
        </div>

        {approvedMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">No members yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {sortedMembers.map((m) => {
              const isMe      = m.userId === user.id;
              const isCreator = group.createdBy === m.userId;
              const roleConfig = ROLE_CONFIG[m.role] ?? ROLE_CONFIG.member;
              const RoleIcon   = roleConfig.icon;
              const eligibility = memberEligibility.get(m.userId);

              return (
                <div key={m.userId} className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/profile/${m.username ?? m.userId}`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
                    >
                      {m.avatar
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={m.avatar} alt="" className="h-full w-full object-cover" />
                        : m.name?.charAt(0).toUpperCase() ?? "?"}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/profile/${m.username ?? m.userId}`}
                          className="truncate text-sm font-semibold text-slate-900 transition-colors hover:text-indigo-600"
                        >
                          {m.name ?? "Unknown"}
                        </Link>
                        {isMe && <span className="text-[11px] font-medium text-indigo-500">(you)</span>}
                        {isCreator && (
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600">
                            <Crown className="h-3 w-3" /> Creator
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1">
                        <RoleIcon className={`h-3 w-3 ${roleConfig.color.split(" ")[1]}`} />
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleConfig.color}`}>
                          {roleConfig.label}
                        </span>
                      </div>
                    </div>

                    {isApprovedMember && !isMe && (
                      <StartConversationButton
                        targetUserId={m.userId}
                        disabled={eligibility?.allowed === false}
                        disabledReason={eligibility?.reason}
                        label="Message"
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1.5 text-xs"
                      />
                    )}
                  </div>

                  {isAdmin && !isMe && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 pl-[52px]">
                      <UpdateRoleForm groupId={group.id} targetUserId={m.userId} currentRole={m.role} />
                      {!isCreator && <RemoveMemberForm groupId={group.id} targetUserId={m.userId} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isApprovedMember && (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Join the group to see the full member list and start conversations.
          </div>
        )}
      </section>
    </div>
  );
}
