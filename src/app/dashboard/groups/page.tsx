import { db } from "@/db";
import { groups, groupMemberships, groupPosts, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq, desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, ArrowLeft, Hash, Lock, MessageCircle } from "lucide-react";
import Link from "next/link";

export default async function GroupsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const allGroups = await db.select().from(groups);

  const userMemberships = await db
    .select({ groupId: groupMemberships.groupId })
    .from(groupMemberships)
    .where(eq(groupMemberships.userId, user.id));

  const memberGroupIds = userMemberships.map((m) => m.groupId);

  // Fetch last message + member count for each group
  const groupDetails = await Promise.all(
    allGroups.map(async (group) => {
      const [lastPost] = await db
        .select({ content: groupPosts.content, createdAt: groupPosts.createdAt, authorName: users.displayName })
        .from(groupPosts)
        .leftJoin(users, eq(groupPosts.authorId, users.id))
        .where(eq(groupPosts.groupId, group.id))
        .orderBy(desc(groupPosts.createdAt))
        .limit(1);

      const memberCount = await db
        .select({ userId: groupMemberships.userId })
        .from(groupMemberships)
        .where(eq(groupMemberships.groupId, group.id));

      return { ...group, lastPost: lastPost || null, memberCount: memberCount.length };
    })
  );

  const myGroups = groupDetails.filter(g => memberGroupIds.includes(g.id));
  const discoverGroups = groupDetails.filter(g => !memberGroupIds.includes(g.id));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b bg-white h-16 flex items-center justify-between px-6 shadow-sm">
        <Link href="/dashboard" className="text-xl font-extrabold bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text">
          SkillPulse
        </Link>
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Button>
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Groups</h1>
            <p className="text-sm text-slate-500 mt-0.5">Learn and grow with your community</p>
          </div>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="h-4 w-4" /> New Group
          </Button>
        </div>

        {/* MY GROUPS — WhatsApp conversation list style */}
        {myGroups.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Your Groups</p>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
              {myGroups.map((group) => (
                <Link key={group.id} href={`/dashboard/groups/${group.slug}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 transition-colors">
                  {/* Group Avatar */}
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0 shadow-sm">
                    <Hash className="h-6 w-6 text-white" />
                  </div>

                  {/* Group Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-slate-900 text-sm truncate">{group.name}</span>
                      {group.lastPost && (
                        <span className="text-[11px] text-slate-400 shrink-0 ml-2">
                          {new Date(group.lastPost.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500 truncate">
                        {group.lastPost
                          ? <><span className="font-medium text-slate-600">{group.lastPost.authorName?.split(" ")[0]}:</span> {group.lastPost.content}</>
                          : <span className="italic">No messages yet</span>
                        }
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0 ml-2">
                        <Users className="h-3 w-3" />
                        {group.memberCount}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* DISCOVER GROUPS */}
        {discoverGroups.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Discover</p>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
              {discoverGroups.map((group) => (
                <div key={group.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 transition-colors">
                  {/* Group Avatar */}
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shrink-0 shadow-sm">
                    {group.isPrivate ? (
                      <Lock className="h-5 w-5 text-white" />
                    ) : (
                      <Hash className="h-6 w-6 text-white" />
                    )}
                  </div>

                  {/* Group Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-slate-900 text-sm truncate">{group.name}</span>
                      {group.isPrivate && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Private</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{group.description}</p>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                      <Users className="h-3 w-3" />
                      {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                    </div>
                  </div>

                  {/* Join Button */}
                  <form action="/api/groups/join" method="POST" className="shrink-0">
                    <input type="hidden" name="groupId" value={group.id} />
                    <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5" /> Join
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {allGroups.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <Users className="h-7 w-7 text-indigo-400" />
            </div>
            <p className="font-semibold text-slate-700">No groups yet</p>
            <p className="text-sm text-slate-400 mt-1">Create the first group and start learning together.</p>
            <Button className="mt-6 bg-indigo-600 hover:bg-indigo-700 gap-2">
              <Plus className="h-4 w-4" /> Create a Group
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
