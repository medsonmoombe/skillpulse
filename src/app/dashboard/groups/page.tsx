import { db } from "@/db";
import { groupMemberships, groupPosts, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq, desc, sql } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Lock, Clock, Sparkles, ShieldCheck, ChevronRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { listGroupsWithGovernance, listUserGroupMembershipStates } from "@/lib/group-governance";
import { GroupsDiscoverSection } from "@/components/GroupsDiscoverSection";

const GRADIENTS = [
  "from-indigo-400 to-purple-500",
  "from-sky-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-violet-400 to-purple-600",
];

type GroupsPageProps = PageProps<"/dashboard/groups">;

export default async function GroupsPage(props: GroupsPageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const allGroups = await listGroupsWithGovernance();
  const userMemberships = await listUserGroupMembershipStates(user.id);

  const approvedGroupIds = new Set(userMemberships.filter((m) => m.status === "approved").map((m) => m.groupId));
  const pendingGroupIds = new Set(userMemberships.filter((m) => m.status === "pending").map((m) => m.groupId));
  const myRoleMap = new Map(userMemberships.filter((m) => m.status === "approved").map((m) => [m.groupId, m.role]));

  const searchParams = await props.searchParams;
  const joinStatus = typeof searchParams.join === "string" ? searchParams.join : null;
  const joinGroupSlug = typeof searchParams.group === "string" ? searchParams.group : null;

  const groupDetails = await Promise.all(
    allGroups.map(async (group, idx) => {
      const [{ count }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(groupMemberships)
        .where(eq(groupMemberships.groupId, group.id));

      return {
        ...group,
        memberCount: count,
        gradient: GRADIENTS[idx % GRADIENTS.length],
        myRole: myRoleMap.get(group.id) ?? null,
      };
    })
  );

  const myGroups = groupDetails.filter((g) => approvedGroupIds.has(g.id));
  const pendingGroups = groupDetails.filter((g) => pendingGroupIds.has(g.id));
  const discoverGroups = groupDetails.filter((g) => !approvedGroupIds.has(g.id) && !pendingGroupIds.has(g.id));

  return (
    <div className="space-y-8">
      {joinStatus === "requested" && joinGroupSlug && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Clock className="h-4 w-4 shrink-0 text-amber-500" />
          Your request to join <span className="font-semibold">{joinGroupSlug}</span> is pending admin approval.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Groups</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {myGroups.length > 0
              ? `You're in ${myGroups.length} group${myGroups.length !== 1 ? "s" : ""} · ${discoverGroups.length} more to explore`
              : "Find your community and start learning together"}
          </p>
        </div>
        <Button asChild size="sm" className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 shadow-md shadow-indigo-500/20 hover:opacity-90">
          <Link href="/dashboard/groups/new"><Plus className="h-4 w-4" /> New Group</Link>
        </Button>
      </div>

      {/* My Groups — compact horizontal list */}
      {myGroups.length > 0 && (
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Your Groups ({myGroups.length})</p>
          <div className="space-y-2">
            {myGroups.map((group) => (
              <Link key={group.id} href={`/dashboard/groups/${group.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 hover:border-indigo-200 hover:shadow-sm transition-all">
                <div className={`h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br ${group.gradient} flex items-center justify-center`}>
                  {group.coverImageUrl ? (
                    <Image src={group.coverImageUrl} alt={group.name} width={40} height={40} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-white">{group.name.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{group.name}</p>
                    {group.myRole === "admin" && <Badge className="border-0 bg-indigo-100 text-indigo-700 text-[10px]">Admin</Badge>}
                    {group.isPrivate && <Lock className="h-3 w-3 text-slate-400 shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-400">{group.memberCount} members</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Pending */}
      {pendingGroups.length > 0 && (
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Pending Approval</p>
          <div className="space-y-2">
            {pendingGroups.map((group) => (
              <div key={group.id} className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className={`h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br ${group.gradient} flex items-center justify-center`}>
                  <span className="text-sm font-bold text-white">{group.name.charAt(0)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{group.name}</p>
                  <p className="text-xs text-amber-700">Awaiting admin approval</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Discover — client component with search/filter */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-slate-400" />
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Discover Groups</p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{discoverGroups.length}</span>
        </div>
        <GroupsDiscoverSection
          groups={discoverGroups.map((g) => ({
            id: g.id,
            name: g.name,
            slug: g.slug,
            description: g.description,
            coverImageUrl: g.coverImageUrl,
            isPrivate: g.isPrivate,
            joinMode: g.joinMode,
            memberCount: g.memberCount,
            gradient: g.gradient,
          }))}
        />
      </section>

      {allGroups.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
            <Users className="h-8 w-8 text-indigo-300" />
          </div>
          <p className="font-semibold text-slate-700">No groups yet</p>
          <p className="mt-1 text-sm text-slate-400">Create the first group and start learning together.</p>
          <Button asChild className="mt-6 gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Link href="/dashboard/groups/new"><Plus className="h-4 w-4" /> Create a Group</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
