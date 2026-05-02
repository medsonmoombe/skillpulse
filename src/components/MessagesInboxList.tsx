"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Users, Search, LoaderCircle } from "lucide-react";

type ConversationPreview = {
  id: string;
  type: "direct" | "group";
  title: string;
  subtitle: string;
  imageUrl: string | null;
  participantCount: number;
  updatedAt: string;
  unreadCount: number;
};

type Props = {
  initialConversations: ConversationPreview[];
};

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ConversationRow({ conv, active }: { conv: ConversationPreview; active: boolean }) {
  return (
    <Link
      href={`/dashboard/messages/${conv.id}`}
      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all ${
        active
          ? "bg-indigo-50 ring-1 ring-indigo-200"
          : conv.unreadCount > 0
          ? "bg-white hover:bg-slate-50"
          : "hover:bg-slate-50"
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 text-sm font-bold text-white shadow-sm">
          {conv.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={conv.imageUrl} alt={conv.title} className="h-full w-full object-cover" />
          ) : conv.type === "group" ? (
            <Users className="h-4.5 w-4.5" />
          ) : (
            conv.title.charAt(0).toUpperCase()
          )}
        </div>
        {conv.unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white">
            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
          </span>
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <p className={`truncate text-sm ${conv.unreadCount > 0 ? "font-bold text-slate-900" : "font-medium text-slate-800"}`}>
            {conv.title}
          </p>
          <span className="shrink-0 text-[10px] text-slate-400">{timeLabel(conv.updatedAt)}</span>
        </div>
        <p className={`mt-0.5 truncate text-xs ${conv.unreadCount > 0 ? "font-medium text-slate-600" : "text-slate-400"}`}>
          {conv.subtitle}
        </p>
      </div>
    </Link>
  );
}

export function MessagesInboxList({ initialConversations }: Props) {
  const pathname = usePathname();
  const [conversations, setConversations] = useState(initialConversations);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { setConversations(initialConversations); }, [initialConversations]);

  const fetchConversations = async () => {
    startTransition(() => setIsRefreshing(true));
    try {
      const res = await fetch("/api/messages/conversations", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as ConversationPreview[];
      startTransition(() => setConversations(data));
    } catch { /* quiet */ } finally {
      startTransition(() => setIsRefreshing(false));
    }
  };

  useEffect(() => {
    void fetchConversations();
    const interval = setInterval(fetchConversations, 60000);
    const onUpdated = () => void fetchConversations();
    window.addEventListener("skillpulse:messages-updated", onUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener("skillpulse:messages-updated", onUpdated);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q));
  }, [conversations, search]);

  const directs = filtered.filter((c) => c.type === "direct");
  const groups  = filtered.filter((c) => c.type === "group");

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full rounded-xl bg-slate-100 py-2 pl-8 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-300"
          />
          {isRefreshing && (
            <LoaderCircle className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-slate-400" />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <MessageSquare className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No conversations yet</p>
            <p className="mt-1 text-xs text-slate-400">Start a conversation from someone's profile</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">No results for "{search}"</p>
        ) : (
          <>
            {directs.length > 0 && (
              <div>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Direct Messages
                </p>
                {directs.map((c) => (
                  <ConversationRow
                    key={c.id}
                    conv={c}
                    active={pathname === `/dashboard/messages/${c.id}`}
                  />
                ))}
              </div>
            )}
            {groups.length > 0 && (
              <div className={directs.length > 0 ? "mt-4" : ""}>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Group Chats
                </p>
                {groups.map((c) => (
                  <ConversationRow
                    key={c.id}
                    conv={c}
                    active={pathname === `/dashboard/messages/${c.id}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
