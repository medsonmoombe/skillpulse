"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ClientSideSuspense,
  RoomProvider,
  useAttachmentUrl,
  useOthers,
  useSelf,
  useStatus,
  useThreads,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { Composer, type ComposerSubmitComment } from "@liveblocks/react-ui";
import "@liveblocks/react-ui/styles.css";
import { Pin, Search, Send, X, WifiOff } from "lucide-react";

interface ChatRoomProps {
  roomId: string;
  conversationId: string;
  typingLabel: string;
  isGroupConversation?: boolean;
  showTypingIndicators?: boolean;
  showReadReceipts?: boolean;
  canSendMessages?: boolean;
}

type PinnedMessage = { threadId: string; preview: string };
type ChatAttachment = { id?: string; url?: string; type: string; name: string };
type RichTextNode = { text?: string };
type RichTextBlock = { children?: RichTextNode[] };
type ComposerBodyLike = {
  content?: RichTextBlock[];
  attachments?: Array<{ id?: string; mimeType?: string | null; type?: string | null; name?: string | null }>;
};
type CommentLike = {
  body?: ComposerBodyLike;
  attachments?: Array<{ id?: string; mimeType?: string | null; type?: string | null; name?: string | null }>;
  userInfo?: { name?: string; avatar?: string };
};

function extractTextFromBody(body: ComposerBodyLike | undefined): string {
  if (!body) return "";
  try {
    return (body.content ?? [])
      .flatMap((b) => b.children ?? [])
      .filter((n) => n.text && !n.text.startsWith("[attachment:"))
      .map((n) => n.text)
      .join(" ")
      .trim();
  } catch { return ""; }
}

function extractAttachments(comment: CommentLike): ChatAttachment[] {
  const results: ChatAttachment[] = [];
  const push = (a: { id?: string; mimeType?: string | null; type?: string | null; name?: string | null }) => {
    if (a?.id && !results.some((r) => r.id === a.id))
      results.push({ id: a.id, type: a.mimeType ?? a.type ?? "", name: a.name ?? "file" });
  };
  comment?.attachments?.forEach(push);
  comment?.body?.attachments?.forEach(push);
  try {
    for (const block of comment?.body?.content ?? [])
      for (const node of block.children ?? []) {
        const m = node.text?.match(/^\[attachment:(.+?)\|(.+?)\|(.+?)\]$/);
        if (m && !results.some((r) => r.url === m[1]))
          results.push({ url: m[1], type: m[2], name: m[3] });
      }
  } catch {}
  return results;
}

function ChatAttachmentItem({ attachment }: { attachment: ChatAttachment }) {
  const { url } = useAttachmentUrl(attachment.id ?? "");
  const resolved = attachment.url ?? url;
  if (!resolved) return null;
  if (attachment.type.startsWith("image/"))
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={resolved} alt={attachment.name}
        className="max-w-[260px] cursor-pointer rounded-2xl object-cover shadow-sm transition-opacity hover:opacity-90"
        onClick={() => window.open(resolved, "_blank")} />
    );
  if (attachment.type.startsWith("video/"))
    return <video src={resolved} controls className="max-w-[260px] rounded-2xl shadow-sm" />;
  return (
    <a href={resolved} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-indigo-600 hover:bg-slate-50">
      📎 {attachment.name}
    </a>
  );
}

function DateSeparator({ date }: { date: Date }) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  let label: string;
  if (msgDay.getTime() === today.getTime()) label = "Today";
  else if (msgDay.getTime() === yesterday.getTime()) label = "Yesterday";
  else label = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-px flex-1 bg-slate-100" />
      <span className="rounded-full bg-slate-100 px-3 py-0.5 text-[11px] font-medium text-slate-400">{label}</span>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  );
}

export function ChatRoom(props: ChatRoomProps) {
  return (
    <RoomProvider id={props.roomId} initialPresence={{ isTyping: false, typingAt: null }}>
      <ClientSideSuspense fallback={
        <div className="flex h-full items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <p className="text-sm text-slate-400">Connecting…</p>
          </div>
        </div>
      }>
        <ChatContent {...props} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}

function ChatContent({
  conversationId, typingLabel, isGroupConversation = false,
  showTypingIndicators = true, canSendMessages = true,
}: Omit<ChatRoomProps, "roomId">) {
  const { threads } = useThreads();
  const status = useStatus();
  const updateMyPresence = useUpdateMyPresence();
  const self = useSelf();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, { name: string; avatar: string | null }>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stopTypingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve userIds → display names
  useEffect(() => {
    const ids = Array.from(new Set(threads.flatMap((t) => t.comments.map((c) => c.userId))))
      .filter((id) => id && !userNames[id]);
    if (!ids.length) return;
    const params = ids.map((id) => `userIds=${encodeURIComponent(id)}`).join("&");
    fetch(`/api/liveblocks/users?${params}`)
      .then((r) => r.json())
      .then((resolved: { name: string; avatar?: string }[]) => {
        const map: Record<string, { name: string; avatar: string | null }> = {};
        ids.forEach((id, i) => { map[id] = { name: resolved[i]?.name ?? id, avatar: resolved[i]?.avatar ?? null }; });
        setUserNames((prev) => ({ ...prev, ...map }));
      }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads]);

  const typingUsers = useOthers((others) =>
    showTypingIndicators ? others.filter((u) => u.presence?.isTyping).map((u) => u.info?.name ?? "Someone") : []
  );

  const sortedThreads = useMemo(
    () => [...threads].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    [threads]
  );

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return sortedThreads;
    const q = searchQuery.toLowerCase();
    return sortedThreads.filter((t) => t.comments.some((c) => JSON.stringify(c.body).toLowerCase().includes(q)));
  }, [searchQuery, sortedThreads]);

  // Flatten all comments into a single list for grouping
  const allComments = useMemo(() =>
    filteredThreads.flatMap((thread) =>
      thread.comments.map((comment) => ({ ...comment, threadId: thread.id }))
    ).filter((c) => {
      const meta = c as unknown as CommentLike;
      return extractTextFromBody(meta.body) || extractAttachments(meta).length > 0;
    }),
    [filteredThreads]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allComments.length]);

  const announceTyping = useCallback(() => {
    if (!showTypingIndicators) return;
    updateMyPresence({ isTyping: true, typingAt: Date.now() });
    if (stopTypingRef.current) clearTimeout(stopTypingRef.current);
    stopTypingRef.current = setTimeout(() => updateMyPresence({ isTyping: false, typingAt: null }), 2000);
  }, [showTypingIndicators, updateMyPresence]);

  const stopTyping = useCallback(() => {
    if (!showTypingIndicators) return;
    updateMyPresence({ isTyping: false, typingAt: null });
    if (stopTypingRef.current) clearTimeout(stopTypingRef.current);
  }, [showTypingIndicators, updateMyPresence]);

  useEffect(() => () => { if (stopTypingRef.current) clearTimeout(stopTypingRef.current); }, []);

  const pinThread = useCallback((threadId: string) => {
    const thread = sortedThreads.find((t) => t.id === threadId);
    if (!thread) return;
    const preview = JSON.stringify(thread.comments[0]?.body ?? "").slice(0, 60);
    setPinnedMessages((prev) =>
      prev.some((p) => p.threadId === threadId)
        ? prev.filter((p) => p.threadId !== threadId)
        : [...prev, { threadId, preview }]
    );
  }, [sortedThreads]);

  const handleComposerSubmit = useCallback(async ({ body, attachments }: ComposerSubmitComment) => {
    stopTyping();
    setIsSyncing(true);
    try {
      const res = await fetch("/api/messages/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId, body,
          attachments: attachments.map((a) => ({ id: a.id, name: a.name, mimeType: a.mimeType, size: a.size })),
        }),
      });
      if (!res.ok) throw new Error("Sync failed");
      window.dispatchEvent(new Event("skillpulse:messages-updated"));
    } finally {
      startTransition(() => setIsSyncing(false));
    }
  }, [conversationId, stopTyping]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages…"
            className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
          <button onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
            <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
          </button>
        </div>
      )}

      {/* Pinned */}
      {pinnedMessages.length > 0 && (
        <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2">
          <Pin className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <p className="flex-1 truncate text-xs text-amber-700">{pinnedMessages.length} pinned</p>
          <button onClick={() => setPinnedMessages([])} className="text-xs text-amber-600 hover:underline">Clear</button>
        </div>
      )}

      {/* Slim status bar */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          {status === "connected" ? (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          ) : (
            <WifiOff className="h-3 w-3 text-amber-400" />
          )}
          {status === "connected" ? "Live" : "Reconnecting…"}
          {isSyncing && <span className="ml-1 text-indigo-400">Sending…</span>}
        </div>
        <button onClick={() => setShowSearch((p) => !p)}
          className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
          <Search className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {allComments.length === 0 ? (
          <div className="flex h-full min-h-48 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                <Send className="h-5 w-5 text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                {searchQuery ? "No messages match your search" : "No messages yet"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {searchQuery ? "Try a different term" : "Send the first message below"}
              </p>
            </div>
          </div>
        ) : (
          allComments.map((comment, idx) => {
            const meta = comment as unknown as CommentLike;
            const isOwn = comment.userId === self?.id;
            const resolved = userNames[comment.userId];
            const name = isOwn
              ? (self?.info?.name ?? resolved?.name ?? "You")
              : (resolved?.name ?? meta.userInfo?.name ?? null); // null = still loading
            const avatar = isOwn
              ? (self?.info?.avatar ?? resolved?.avatar ?? null)
              : (resolved?.avatar ?? meta.userInfo?.avatar ?? null);

            const bodyText = extractTextFromBody(meta.body);
            const attachments = extractAttachments(meta);
            const isPinned = pinnedMessages.some((p) => p.threadId === comment.threadId);

            // Grouping: same author as previous comment within 5 minutes
            const prev = allComments[idx - 1];
            const next = allComments[idx + 1];
            const prevDate = prev ? new Date(prev.createdAt) : null;
            const thisDate = new Date(comment.createdAt);
            const sameAuthorAsPrev = prev?.userId === comment.userId &&
              prevDate && (thisDate.getTime() - prevDate.getTime()) < 5 * 60 * 1000;
            const sameAuthorAsNext = next?.userId === comment.userId &&
              new Date(next.createdAt).getTime() - thisDate.getTime() < 5 * 60 * 1000;

            // Date separator
            const showDateSep = !prev ||
              new Date(prev.createdAt).toDateString() !== thisDate.toDateString();

            // Show avatar only on last message in a group
            const showAvatar = !sameAuthorAsNext;
            // Show name only on first message in a group (group chats only)
            const showName = isGroupConversation && !sameAuthorAsPrev;

            const time = thisDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return (
              <div key={comment.id}>
                {showDateSep && <DateSeparator date={thisDate} />}

                <div className={`group flex items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"} ${sameAuthorAsPrev ? "mt-0.5" : "mt-3"}`}>

                  {/* Avatar placeholder — keeps alignment even when hidden */}
                  {!isOwn && (
                    <div className="w-8 shrink-0">
                      {showAvatar ? (
                        <a href={`/profile/${comment.userId}`} className="hover:opacity-80 transition-opacity">
                          {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatar} alt={name ?? ""} className="h-8 w-8 rounded-full object-cover" />
                          ) : name ? (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-bold text-white">
                              {name.charAt(0).toUpperCase()}
                            </div>
                          ) : (
                            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
                          )}
                        </a>
                      ) : null}
                    </div>
                  )}

                  <div className={`flex max-w-[72%] flex-col ${isOwn ? "items-end" : "items-start"}`}>
                    {/* Name — only first in group, group chats only */}
                    {showName && (
                      name ? (
                        <a href={`/profile/${comment.userId}`}
                          className="mb-1 px-1 text-[11px] font-semibold text-indigo-600 hover:underline">
                          {name}
                        </a>
                      ) : (
                        <div className="mb-1 h-3 w-20 animate-pulse rounded bg-slate-200" />
                      )
                    )}

                    {/* Bubble */}
                    {bodyText && (
                      <div className={`relative break-words px-3.5 py-2 text-sm leading-relaxed ${
                        isOwn
                          ? `bg-indigo-600 text-white ${sameAuthorAsPrev ? "rounded-2xl rounded-tr-md" : "rounded-2xl rounded-tr-sm"}`
                          : `bg-slate-100 text-slate-800 ${sameAuthorAsPrev ? "rounded-2xl rounded-tl-md" : "rounded-2xl rounded-tl-sm"}`
                      }`}>
                        {bodyText}
                        {isPinned && <Pin className="ml-1 inline h-3 w-3 text-amber-400" />}
                      </div>
                    )}

                    {attachments.map((att, i) => (
                      <ChatAttachmentItem key={att.id ?? att.url ?? `${comment.id}-${i}`} attachment={att} />
                    ))}

                    {/* Timestamp — only on last in group */}
                    {!sameAuthorAsNext && (
                      <span className="mt-1 px-1 text-[10px] text-slate-400">{time}</span>
                    )}
                  </div>

                  {/* Pin button on hover */}
                  <button onClick={() => pinThread(comment.threadId)}
                    className="hidden h-6 w-6 shrink-0 items-center justify-center self-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:text-amber-500 group-hover:flex"
                    title={isPinned ? "Unpin" : "Pin"}>
                    <Pin className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {showTypingIndicators && typingUsers.length > 0 && (
        <div className="px-4 pb-1">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
            </div>
            <span className="text-xs text-slate-400">
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing`
                : typingUsers.length === 2
                  ? `${typingUsers[0]} and ${typingUsers[1]} are typing`
                  : `${typingUsers.length} people are typing`}
            </span>
          </div>
        </div>
      )}

      {/* Composer */}
      {canSendMessages ? (
        <div className="border-t border-slate-100 bg-white px-3 py-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-1 transition-colors focus-within:border-indigo-300 focus-within:bg-white focus-within:shadow-sm">
            <Composer
              showFormattingControls={false}
              onFocus={announceTyping}
              onBlur={stopTyping}
              onComposerSubmit={handleComposerSubmit}
              overrides={{
                COMPOSER_PLACEHOLDER: isGroupConversation ? "Message the group…" : `Message ${typingLabel}…`,
                COMPOSER_SEND: "Send",
              }}
            />
          </div>
          <p className="mt-1 px-1 text-[11px] text-slate-400">
            <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to send
          </p>
        </div>
      ) : (
        <div className="border-t border-slate-100 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-700">Only admins can send messages in this conversation.</p>
        </div>
      )}
    </div>
  );
}
