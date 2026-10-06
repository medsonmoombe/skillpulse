import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Crown,
  Hash,
  Lock,
  MessageSquare,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import {
  canUserManageGroup,
  getGroupBySlugWithGovernance,
  getGroupMembershipState,
  listGroupMembers,
} from "@/lib/group-governance";
import { GoLiveButton } from "@/components/GoLiveButton";
import { OpenGroupChatButton } from "@/components/OpenGroupChatButton";
import { JoinGroupButton } from "@/components/JoinGroupButton";
import {
  ApproveMemberForm,
  GovernanceForm,
  RejectMemberForm,
} from "@/components/GroupAdminForms";

interface GroupPageProps {
  params: Promise<{ slug: string }>;
}

const ROLE_CONFIG = {
  admin: { label: "Admin", color: "bg-indigo-100 text-indigo-700", icon: Crown },
  moderator: { label: "Mod", color: "bg-purple-100 text-purple-700", icon: ShieldCheck },
  member: { label: "Member", color: "bg-slate-100 text-slate-600", icon: Users },
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

  const isApprovedMember = membershipState?.status === "approved";
  const isPendingMember = membershipState?.status === "pending";
  const myRole = membershipState?.role ?? "member";

  const approvedMembers = memberships.filter((member) => member.status === "approved");
  const pendingMembers = memberships.filter((member) => member.status === "pending");

  const [activeRoom] = await db
    .select()
    .from(rooms)
    .where(and(eq(rooms.groupId, group.id), eq(rooms.status, "active")));

  return (
    <div className="space-y-0">
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
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm ${
                    group.joinMode === "approval_required" ? "bg-amber-500/70" : "bg-emerald-500/70"
                  }`}
                >
                  {group.joinMode === "approval_required" ? "Approval required" : "Open entry"}
                </span>
                {isAdmin && (
                  <span className="flex items-center gap-1 rounded-full bg-indigo-600/80 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                    <Crown className="h-3 w-3" /> Admin
                  </span>
                )}
                {!isApprovedMember && !isPendingMember && (
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                    Preview
                  </span>
                )}
                {isPendingMember && (
                  <span className="rounded-full bg-amber-500/70 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                    Request pending
                  </span>
                )}
              </div>
              <h1 className="text-xl font-extrabold text-white drop-shadow-sm md:text-2xl">{group.name}</h1>
            </div>
            {/* Members avatar stack — links to members page */}
            <Link
              href={`/dashboard/groups/${group.slug}/members`}
              className="flex shrink-0 items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur-sm transition hover:bg-black/50"
            >
              <div className="flex -space-x-2">
                {approvedMembers.slice(0, 4).map((m) => (
                  <div key={m.userId} className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-white/60 bg-gradient-to-br from-indigo-400 to-purple-500 text-[9px] font-bold text-white">
                    {m.avatar
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={m.avatar} alt="" className="h-full w-full object-cover" />
                      : m.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                ))}
              </div>
              <span className="text-xs font-semibold text-white">{approvedMembers.length}</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {isApprovedMember ? (
          <OpenGroupChatButton
            groupId={group.id}
            label="Open Chat"
            size="sm"
            className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700"
          />
        ) : isPendingMember ? (
          <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
            Your join request is awaiting approval
          </span>
        ) : (
          <JoinGroupButton groupId={group.id} joinMode={group.joinMode as "open" | "approval_required"} />
        )}

        {isApprovedMember && activeRoom ? (
          <Link
            href={`/dashboard/room/${activeRoom.id}`}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            Live - Join
          </Link>
        ) : isApprovedMember && isAdmin ? (
          <GoLiveButton groupId={group.id} />
        ) : isApprovedMember ? (
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
            Only admins can start live rooms
          </span>
        ) : null}

        {isApprovedMember && isAdmin && (
          <Link
            href={`/dashboard/groups/${group.slug}/edit`}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
          >
            Edit Group
          </Link>
        )}

        <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          <Hash className="h-3.5 w-3.5" />
          {isApprovedMember
            ? group.memberMessagingPolicy === "admins_only"
              ? "Admins only can message"
              : "All members can message"
            : "Join to unlock chat and live access"}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm leading-relaxed text-slate-600">{group.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {isApprovedMember && isAdmin && pendingMembers.length > 0 && (
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
                      {member.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={member.avatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        member.name?.charAt(0).toUpperCase() ?? "?"
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{member.name ?? "Unknown"}</p>
                      <p className="text-xs text-slate-500">Requesting to join</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <ApproveMemberForm groupId={group.id} targetUserId={member.userId} />
                      <RejectMemberForm groupId={group.id} targetUserId={member.userId} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="flex -space-x-2">
                {approvedMembers.slice(0, 5).map((m) => (
                  <Link key={m.userId} href={`/profile/${m.username ?? m.userId}`} className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-indigo-400 to-purple-500 text-[10px] font-bold text-white">
                    {m.avatar
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={m.avatar} alt="" className="h-full w-full object-cover" />
                      : m.name?.charAt(0).toUpperCase() ?? "?"}
                  </Link>
                ))}
                {approvedMembers.length > 5 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-600">
                    +{approvedMembers.length - 5}
                  </div>
                )}
              </div>
              <Link
                href={`/dashboard/groups/${group.slug}/members`}
                className="flex min-w-0 flex-1 items-center gap-3 transition hover:text-indigo-600"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{approvedMembers.length} Member{approvedMembers.length !== 1 ? "s" : ""}</p>
                  <p className="text-xs text-slate-400">View all members</p>
                </div>
                <Users className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-br from-indigo-50 to-purple-50 px-5 py-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-500" />
                <p className="text-sm font-bold text-slate-900">Group Chat</p>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Live messaging, notifications, and collaboration for approved members.
              </p>
            </div>
            <div className="space-y-2 p-4">
              {isApprovedMember ? (
                <OpenGroupChatButton
                  groupId={group.id}
                  label="Open group chat"
                  size="sm"
                  className="w-full gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700"
                />
              ) : (
                <JoinGroupButton
                  groupId={group.id}
                  joinMode={group.joinMode as "open" | "approval_required"}
                  disabled={isPendingMember}
                  label={isPendingMember ? "Request Pending" : group.joinMode === "approval_required" ? "Request access" : "Join group"}
                  className="w-full rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                />
              )}

              {isApprovedMember && activeRoom ? (
                <Link
                  href={`/dashboard/room/${activeRoom.id}`}
                  className="flex w-full items-center justify-between rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 transition hover:bg-red-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    <span className="text-xs font-semibold text-red-700">Live session active</span>
                  </div>
                </Link>
              ) : isApprovedMember && isAdmin ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="mb-2 text-xs text-slate-500">No live session running</p>
                  <GoLiveButton groupId={group.id} />
                </div>
              ) : isApprovedMember ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Only group admins can create live group sessions.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Chat and live sessions unlock after you join the group.</p>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
              <Hash className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-bold text-slate-900">Group Info</p>
            </div>
            <div className="space-y-3 p-4">
              {[
                { label: "Entry", value: group.joinMode === "approval_required" ? "Approval required" : "Open entry" },
                { label: "Messaging", value: isApprovedMember ? (group.memberMessagingPolicy === "admins_only" ? "Admins only" : "All members") : "Members only" },
                { label: "Privacy", value: group.isPrivate ? "Private" : "Public" },
                { label: "Members", value: `${approvedMembers.length} approved` },
                ...(isApprovedMember && isAdmin && pendingMembers.length > 0
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

          {isApprovedMember && isAdmin && (
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

          {isApprovedMember && !isAdmin && (
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Your Role</p>
              {(() => {
                const roleConfig = ROLE_CONFIG[myRole] ?? ROLE_CONFIG.member;
                const Icon = roleConfig.icon;

                return (
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${roleConfig.color.split(" ")[1]}`} />
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${roleConfig.color}`}>
                      {roleConfig.label}
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
