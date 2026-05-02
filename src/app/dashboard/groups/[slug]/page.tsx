import { db } from "@/db";
import { rooms } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { GoLiveButton } from "@/components/GoLiveButton";
import { OpenGroupChatButton } from "@/components/OpenGroupChatButton";
import { StartConversationButton } from "@/components/StartConversationButton";
import {
  ApproveMemberForm,
  RejectMemberForm,
  RemoveMemberForm,
  UpdateRoleForm,
  GovernanceForm,
} from "@/components/GroupAdminForms";
import {
  canUserManageGroup,
  getGroupBySlugWithGovernance,
  getGroupMembershipState,
  listGroupMembers,
} from "@/lib/group-governance";
import { getDirectMessageEligibility } from "@/lib/messaging";
import {
  Users, MessageSquare, Lock, Crown, ChevronRight,
  ShieldCheck, Settings, Hash, Clock, ArrowLeft,
} from "lucide-react";

interface GroupPageProps {
  params: Promise<{ slug: string }>;
}

const ROLE_CONFIG = {
  admin:     { label: "Admin",  color: "bg-indigo-100 text-indigo-700", icon: Crown       },
  moderator: { label: "Mod",    color: "bg-purple-100 text-purple-700", icon: ShieldCheck },
  member:    { label: "Member", color: "bg-slate-100 text-slate-600",   icon: Users       },
} as const;

export default async function GroupPage({ params }: GroupPageProps) {
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

  if (membershipState?.status !== "approved") redirect("/dashboard/groups");

  const myRole = membershipState.role;
  const approvedMembers = memberships.filter((m) => m.status === "approved");
  const pendingMembers  = memberships.filter((m) => m.status === "pending");

  const otherIds = Array.from(new Set(
    approvedMembers.map((m) => m.userId).filter((id) => id !== user.id)
  ));
  const eligibilityResults = await Promise.all(
    otherIds.map(async (id) => [id, await getDirectMessageEligibility(user.id, id)] as const)
  );
  const memberEligibility = new Map(eligibilityResults);

  const [activeRoom] = await db
    .select()
    .from(rooms)
    .where(and(eq(rooms.groupId, group.id), eq(rooms.status, "active")));

  const sortedMembers = [...approvedMembers].sort((a, b) => {
    const order = { admin: 0, moderator: 1, member: 2 };
    if (a.userId === user.id) return -1;
    if (b.userId === user.id) return 1;
    return (order[a.role] ?? 3) - (order[b.role] ?? 3);
  });

  return (
    <div className="space-y-0">

      {/* ── COVER BANNER ── */}
      <div className="relative mb-6 overflow-hidden rounded-3xl">
        {group.coverImageUrl ? (
          <div className="relative h-48 w-full md:h-56">
            <Image src={group.coverImageUrl} alt={group.name} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
        ) : (
          <div className="h-36 w-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 md:h-44" />
        )}

        <Link
          href="/dashboard/groups"
          className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                {group.isPrivate && (
                  <span className="flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                    <Lock className="h-3 w-3" /> Private
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-sm ${
                  group.joinMode === "approval_required"
                    ? "bg-amber-500/70 text-white"
                    : "bg-emerald-500/70 text-white"
                }`}>
                  {group.joinMode === "approval_required" ? "Approval required" : "Open entry"}
                </span>
                {isAdmin && (
                  <span className="flex items-center gap-1 rounded-full bg-indigo-600/80 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                    <Crown className="h-3 w-3" /> Admin
                  </span>
                )}
              </div>
              <h1 className="text-xl font-extrabold text-white drop-shadow-sm md:text-2xl">{group.name}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur-sm">
              <Users className="h-3.5 w-3.5 text-white" />
              <span className="text-xs font-semibold text-white">{approvedMembers.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK ACTIONS BAR ── */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <OpenGroupChatButton
          groupId={group.id}
          label="Open Chat"
          size="sm"
          className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
        />
        {activeRoom ? (
          <Link
            href={`/dashboard/room/${activeRoom.id}`}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            Live — Join
          </Link>
        ) : isAdmin ? (
          <GoLiveButton groupId={group.id} />
        ) : (
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
            Only admins can start live rooms
          </span>
        )}
        {isAdmin && (
          <Link
            href={`/dashboard/groups/${group.slug}/edit`}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
          >
            Edit Group
          </Link>
        )}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          <Hash className="h-3.5 w-3.5" />
          {group.memberMessagingPolicy === "admins_only" ? "Admins only can message" : "All members can message"}
        </div>
      </div>

      {/* ── DESCRIPTION ── */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm leading-relaxed text-slate-600">{group.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">

        {/* ── LEFT: MEMBERS ── */}
        <div className="space-y-4">

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
                {pendingMembers.map((member) => (
                  <div key={member.userId} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-white shadow-sm">
                      {member.avatar
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={member.avatar} alt="" className="h-full w-full object-cover" />
                        : member.name?.charAt(0).toUpperCase() ?? "?"
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{member.name ?? "Unknown"}</p>
                      <p className="text-xs text-slate-500">Requesting to join</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <ApproveMemberForm groupId={group.id} targetUserId={member.userId} />
                      <RejectMemberForm  groupId={group.id} targetUserId={member.userId} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Members list */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
              <Users className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Members</h2>
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                {approvedMembers.length}
              </span>
            </div>

            <div className="divide-y divide-slate-50">
              {sortedMembers.map((member) => {
                const isMe      = member.userId === user.id;
                const isCreator = group.createdBy === member.userId;
                const roleConf  = ROLE_CONFIG[member.role] ?? ROLE_CONFIG.member;
                const RoleIcon  = roleConf.icon;
                const eligibility = memberEligibility.get(member.userId);

                return (
                  <div key={member.userId} className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar — links to profile */}
                      <Link href={`/profile/${member.userId}`} className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity">
                        {member.avatar
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={member.avatar} alt="" className="h-full w-full object-cover" />
                          : member.name?.charAt(0).toUpperCase() ?? "?"
                        }
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
                      </Link>

                      {/* Name + role */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link href={`/profile/${member.userId}`} className="truncate text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors">
                            {member.name ?? "Unknown"}
                          </Link>
                          {isMe && <span className="text-[11px] font-medium text-indigo-500">(you)</span>}
                          {isCreator && (
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600">
                              <Crown className="h-3 w-3" /> Creator
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1">
                          <RoleIcon className={`h-3 w-3 ${roleConf.color.split(" ")[1]}`} />
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleConf.color}`}>
                            {roleConf.label}
                          </span>
                        </div>
                      </div>

                      {/* Message button */}
                      {!isMe && (
                        <StartConversationButton
                          targetUserId={member.userId}
                          disabled={eligibility?.allowed === false}
                          disabledReason={eligibility?.reason}
                          label="Message"
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1.5 text-xs"
                        />
                      )}
                    </div>

                    {/* Admin controls */}
                    {isAdmin && !isMe && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 pl-[52px]">
                        <UpdateRoleForm
                          groupId={group.id}
                          targetUserId={member.userId}
                          currentRole={member.role}
                        />
                        {!isCreator && (
                          <RemoveMemberForm groupId={group.id} targetUserId={member.userId} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className="space-y-4">

          {/* Chat + Live card */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50 to-purple-50 px-5 py-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-500" />
                <p className="text-sm font-bold text-slate-900">Group Chat</p>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Live messaging with typing indicators, attachments, and notifications.
              </p>
            </div>
            <div className="space-y-2 p-4">
              <OpenGroupChatButton
                groupId={group.id}
                label="Open group chat"
                size="sm"
                className="w-full gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              />
              {activeRoom ? (
                <Link
                  href={`/dashboard/room/${activeRoom.id}`}
                  className="flex w-full items-center justify-between rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 transition hover:bg-red-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    <span className="text-xs font-semibold text-red-700">Live session active</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-red-500" />
                </Link>
              ) : isAdmin ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="mb-2 text-xs text-slate-500">No live session running</p>
                  <GoLiveButton groupId={group.id} />
                </div>
              ) : (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Only group admins can create live group sessions.</p>
                </div>
              )}
            </div>
          </div>

          {/* Group info */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
              <Hash className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-bold text-slate-900">Group Info</p>
            </div>
            <div className="space-y-3 p-4">
              {[
                { label: "Entry",     value: group.joinMode === "approval_required" ? "Approval required" : "Open entry" },
                { label: "Messaging", value: group.memberMessagingPolicy === "admins_only" ? "Admins only" : "All members" },
                { label: "Privacy",   value: group.isPrivate ? "Private" : "Public" },
                { label: "Members",   value: `${approvedMembers.length} approved` },
                ...(isAdmin && pendingMembers.length > 0
                  ? [{ label: "Pending", value: `${pendingMembers.length} request${pendingMembers.length !== 1 ? "s" : ""}` }]
                  : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-xs font-semibold text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Admin governance controls */}
          {isAdmin && (
            <div className="overflow-hidden rounded-3xl border border-indigo-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-indigo-100 bg-indigo-50 px-5 py-3">
                <Settings className="h-4 w-4 text-indigo-500" />
                <p className="text-sm font-bold text-indigo-900">Group Controls</p>
                <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                  Admin only
                </span>
              </div>
              <GovernanceForm
                groupId={group.id}
                joinMode={group.joinMode}
                memberMessagingPolicy={group.memberMessagingPolicy}
              />
            </div>
          )}

          {/* My role — non-admins */}
          {!isAdmin && (
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Your Role</p>
              {(() => {
                const conf = ROLE_CONFIG[myRole] ?? ROLE_CONFIG.member;
                const Icon = conf.icon;
                return (
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${conf.color.split(" ")[1]}`} />
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${conf.color}`}>
                      {conf.label}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
