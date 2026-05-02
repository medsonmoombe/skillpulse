"use client";

import { useEffect, useState, startTransition } from "react";
import { usePathname } from "next/navigation";
import { MessagesInboxList } from "@/components/MessagesInboxList";
import { MessageSquare, PenLine } from "lucide-react";
import Link from "next/link";

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

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);

  // True when a specific conversation is open (used for mobile: hide sidebar)
  const conversationOpen = pathname !== "/dashboard/messages";

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/messages/conversations", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as ConversationPreview[];
      startTransition(() => {
        setConversations(data);
        setTotalUnread(data.reduce((s, c) => s + c.unreadCount, 0));
      });
    } catch { /* quiet */ }
  };

  useEffect(() => {
    void fetchConversations();
    // Refresh sidebar when a message is sent/received
    const onUpdate = () => void fetchConversations();
    window.addEventListener("skillpulse:messages-updated", onUpdate);
    return () => window.removeEventListener("skillpulse:messages-updated", onUpdate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh unread counts when switching conversations
  useEffect(() => {
    void fetchConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className="-m-4 md:-m-6 flex h-[calc(100vh-4rem)] overflow-hidden bg-white">

      {/* ── SIDEBAR ── hidden on mobile when a conversation is open */}
      <aside className={`flex w-full shrink-0 flex-col border-r border-slate-200 bg-white md:w-72 ${
        conversationOpen ? "hidden md:flex" : "flex"
      }`}>
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900">Messages</h2>
            {totalUnread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>
          <Link
            href="/dashboard"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            title="Back to dashboard"
          >
            <PenLine className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="flex-1 overflow-hidden py-3">
          <MessagesInboxList initialConversations={conversations} />
        </div>
      </aside>

      {/* ── CHAT PANEL ── full width on mobile when conversation open */}
      <div className={`flex flex-1 flex-col overflow-hidden ${
        conversationOpen ? "flex" : "hidden md:flex"
      }`}>
        {children}
      </div>
    </div>
  );
}
