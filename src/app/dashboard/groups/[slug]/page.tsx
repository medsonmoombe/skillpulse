// src/app/dashboard/groups/[slug]/page.tsx
import { db } from "@/db";
import { groups, groupMemberships, groupPosts, users, rooms } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq, desc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatInput } from "@/components/ChatInput";
import { GoLiveButton } from "@/components/GoLiveButton";
import { Users, Hash, Info, Radio } from "lucide-react";
import Link from "next/link";

interface GroupPageProps {
  params: Promise<{ slug: string }>;
}

export default async function GroupPage({ params }: GroupPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/dashboard");

  const { slug } = await params;

  const [group] = await db.select().from(groups).where(eq(groups.slug, slug));
  if (!group) notFound();

  // Fetch members with user details
  const memberships = await db
    .select({ userId: groupMemberships.userId, name: users.displayName, avatar: users.avatarUrl })
    .from(groupMemberships)
    .leftJoin(users, eq(groupMemberships.userId, users.id))
    .where(eq(groupMemberships.groupId, group.id));

  const userIsMember = memberships.some(m => m.userId === user.id);
  if (!userIsMember) redirect("/dashboard/groups");

  // Check for active live room linked to this group
  const [activeRoom] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.groupId, group.id));

  const posts = await db
    .select({
      id: groupPosts.id,
      content: groupPosts.content,
      createdAt: groupPosts.createdAt,
      authorId: groupPosts.authorId,
      authorName: users.displayName,
      authorAvatar: users.avatarUrl,
    })
    .from(groupPosts)
    .leftJoin(users, eq(groupPosts.authorId, users.id))
    .where(eq(groupPosts.groupId, group.id))
    .orderBy(desc(groupPosts.createdAt));

  // Reverse so oldest messages appear at top (like WhatsApp)
  const orderedPosts = [...posts].reverse();

  return (
    <div className="flex flex-col bg-white" style={{ height: 'calc(100vh - 4rem)' }}>

      {/* TOP NAVBAR — handled by dashboard layout */}

      {/* MAIN LAYOUT: sidebar + chat */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT SIDEBAR */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-slate-50">
          {/* Go Live + Active Room Banner */}
          <div className="p-3 border-b space-y-2">
            {activeRoom ? (
              <Link href={`/dashboard/room/${activeRoom.id}`} className="flex items-center justify-between gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 hover:bg-indigo-100 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="text-xs font-semibold text-indigo-700 truncate">Live session active!</span>
                </div>
                <span className="text-xs font-bold text-indigo-600 shrink-0">Join →</span>
              </Link>
            ) : (
              <GoLiveButton groupId={group.id} />
            )}
          </div>

          {/* Members list */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
              Members — {memberships.length}
            </p>
            <div className="space-y-1">
              {memberships.map((member) => (
                <div key={member.userId} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white transition-colors">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar || ""} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs font-semibold">
                        {member.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online dot */}
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-slate-50" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">
                      {member.name || "Unknown"}
                      {member.userId === user.id && <span className="text-indigo-500 ml-1">(you)</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Group info footer */}
          <div className="p-3 border-t">
            <div className="flex items-start gap-2 text-xs text-slate-500 bg-white rounded-lg p-2.5 border">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
              <p className="line-clamp-3">{group.description}</p>
            </div>
          </div>
        </aside>

        {/* RIGHT: CHAT AREA */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">

          {/* Mobile: Go Live / Active Room */}
          <div className="lg:hidden shrink-0 p-3 border-b bg-white">
            {activeRoom ? (
              <Link href={`/dashboard/room/${activeRoom.id}`} className="flex items-center justify-between gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-semibold text-indigo-700">Live session active!</span>
                </div>
                <span className="text-xs font-bold text-indigo-600">Join →</span>
              </Link>
            ) : (
              <GoLiveButton groupId={group.id} />
            )}
          </div>

          {/* MESSAGES — scrollable */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {orderedPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                  <Hash className="h-8 w-8 text-indigo-300" />
                </div>
                <p className="font-semibold text-slate-600">No messages yet</p>
                <p className="text-sm text-slate-400 mt-1">Say hello to kick things off 👋</p>
              </div>
            ) : (
              orderedPosts.map((post, i) => {
                const isOwn = post.authorId === user.id;
                const prevPost = orderedPosts[i - 1];
                const nextPost = orderedPosts[i + 1];
                const isGroupedWithPrev = prevPost?.authorId === post.authorId;
                const isGroupedWithNext = nextPost?.authorId === post.authorId;
                const showAvatar = !isOwn && !isGroupedWithNext;
                const showName = !isOwn && !isGroupedWithPrev;

                return (
                  <div
                    key={post.id}
                    className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"} ${isGroupedWithPrev ? "mt-0.5" : "mt-4"}`}
                  >
                    {/* Avatar — only show for last message in a group (like WhatsApp) */}
                    {!isOwn && (
                      <div className="w-8 shrink-0">
                        {showAvatar && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={post.authorAvatar || ""} />
                            <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs font-semibold">
                              {post.authorName?.charAt(0) || "A"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                      {/* Sender name — only first in group */}
                      {showName && (
                        <span className="text-[11px] font-semibold text-indigo-600 mb-1 px-1">
                          {post.authorName || "Unknown"}
                        </span>
                      )}

                      {/* Bubble */}
                      <div
                        className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words shadow-sm ${
                          isOwn
                            ? "bg-indigo-600 text-white rounded-br-sm"
                            : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm"
                        } ${isGroupedWithPrev && isOwn ? "rounded-tr-2xl" : ""} ${isGroupedWithPrev && !isOwn ? "rounded-tl-2xl" : ""}`}
                      >
                        {post.content}
                      </div>

                      {/* Timestamp — only on last in group */}
                      {!isGroupedWithNext && (
                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                          {new Date(post.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* CHAT INPUT — pinned bottom */}
          <div className="shrink-0 border-t bg-white px-4 py-3">
            <ChatInput groupId={group.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
