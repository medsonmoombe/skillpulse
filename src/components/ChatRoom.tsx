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
import { Pin, Search, Send, X } from "lucide-react";

interface ChatRoomProps {
  roomId: string;
  conversationId: string;
  typingLabel: string;
  isGroupConversation?: boolean;
  showTypingIndicators?: boolean;
  showReadReceipts?: boolean;
  canSendMessages?: boolean;
}

type PinnedMessage = {
  threadId: string;
  preview: string;
};

type ChatAttachment = {
  id?: string;
  url?: string;
  type: string;
  name: string;
};

function extractTextFromBody(body: any): string {
  if (!body) return "";

  try {
    return (body.content ?? [])
      .flatMap((block: any) => block.children ?? [])
      .filter((node: any) => node.text && !node.text.startsWith("[attachment:"))
      .map((node: any) => node.text)
      .join(" ")
      .trim();
  } catch {
    return "";
  }
}

function extractAttachments(comment: any): ChatAttachment[] {
  const results: ChatAttachment[] = [];

  if (Array.isArray(comment?.attachments)) {
    for (const attachment of comment.attachments) {
      if (attachment?.id && !results.some((item) => item.id === attachment.id)) {
        results.push({
          id: attachment.id,
          type: attachment.mimeType ?? attachment.type ?? "",
          name: attachment.name ?? "file",
        });
      }
    }
  }

  const body = comment?.body;
  if (Array.isArray(body?.attachments)) {
    for (const attachment of body.attachments) {
      if (attachment?.id && !results.some((item) => item.id === attachment.id)) {
        results.push({
          id: attachment.id,
          type: attachment.mimeType ?? attachment.type ?? "",
          name: attachment.name ?? "file",
        });
      }
    }
  }

  try {
    for (const block of body?.content ?? []) {
      for (const node of block.children ?? []) {
        const match = node.text?.match(/^\[attachment:(.+?)\|(.+?)\|(.+?)\]$/);
        if (match && !results.some((item) => item.url === match[1])) {
          results.push({ url: match[1], type: match[2], name: match[3] });
        }
      }
    }
  } catch {}

  return results;
}

function ChatAttachmentItem({ attachment }: { attachment: ChatAttachment }) {
  const { url } = useAttachmentUrl(attachment.id ?? "");
  const resolvedUrl = attachment.url ?? url;

  if (!resolvedUrl) {
    return null;
  }

  if (attachment.type.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedUrl}
        alt={attachment.name}
        className="max-w-xs cursor-pointer rounded-2xl object-cover shadow-sm transition-opacity hover:opacity-90"
        onClick={() => window.open(resolvedUrl, "_blank")}
      />
    );
  }

  if (attachment.type.startsWith("video/")) {
    return <video src={resolvedUrl} controls className="max-w-xs rounded-2xl shadow-sm" />;
  }

  return (
    <a
      href={resolvedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-indigo-600 hover:bg-slate-50"
    >
      Attachment {attachment.name}
    </a>
  );
}

export function ChatRoom(props: ChatRoomProps) {
  return (
    <RoomProvider id={props.roomId} initialPresence={{ isTyping: false, typingAt: null }}>
      <ClientSideSuspense
        fallback={
          <div className="flex h-full items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              <p className="text-sm text-slate-400">Connecting...</p>
            </div>
          </div>
        }
      >
        <ChatContent {...props} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}

function ChatContent({
  conversationId,
  typingLabel,
  isGroupConversation = false,
  showTypingIndicators = true,
  canSendMessages = true,
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

  // Resolve all unique userIds in threads to real display names
  useEffect(() => {
    const ids = Array.from(
      new Set(
        threads.flatMap((t) => t.comments.map((c) => c.userId))
      )
    ).filter((id) => id && !userNames[id]);

    if (ids.length === 0) return;

    const params = ids.map((id) => `userIds=${encodeURIComponent(id)}`).join("&");
    fetch(`/api/liveblocks/users?${params}`)
      .then((r) => r.json())
      .then((resolved: { name: string; avatar?: string }[]) => {
        const map: Record<string, { name: string; avatar: string | null }> = {};
        ids.forEach((id, i) => {
          map[id] = { name: resolved[i]?.name ?? id, avatar: resolved[i]?.avatar ?? null };
        });
        setUserNames((prev) => ({ ...prev, ...map }));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads]);

  const typingUsers = useOthers((others) =>
    showTypingIndicators
      ? others.filter((u) => u.presence?.isTyping).map((u) => u.info?.name ?? "Someone")
      : []
  );

  const sortedThreads = useMemo(
    () => [...threads].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    [threads]
  );

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return sortedThreads;
    const query = searchQuery.toLowerCase();

    return sortedThreads.filter((thread) =>
      thread.comments.some((comment) => JSON.stringify(comment.body).toLowerCase().includes(query))
    );
  }, [searchQuery, sortedThreads]);

  const activeThreadId = sortedThreads.at(-1)?.id ?? null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedThreads.length]);

  const announceTyping = useCallback(() => {
    if (!showTypingIndicators) return;

    updateMyPresence({ isTyping: true, typingAt: Date.now() });
    if (stopTypingRef.current) clearTimeout(stopTypingRef.current);

    stopTypingRef.current = setTimeout(() => {
      updateMyPresence({ isTyping: false, typingAt: null });
    }, 2000);
  }, [showTypingIndicators, updateMyPresence]);

  const stopTyping = useCallback(() => {
    if (!showTypingIndicators) return;

    updateMyPresence({ isTyping: false, typingAt: null });
    if (stopTypingRef.current) clearTimeout(stopTypingRef.current);
  }, [showTypingIndicators, updateMyPresence]);

  useEffect(() => {
    return () => {
      if (stopTypingRef.current) clearTimeout(stopTypingRef.current);
    };
  }, []);

  const pinThread = useCallback((threadId: string) => {
    const thread = sortedThreads.find((item) => item.id === threadId);
    if (!thread) return;

    const preview = JSON.stringify(thread.comments[0]?.body ?? "").slice(0, 60);
    setPinnedMessages((prev) =>
      prev.some((item) => item.threadId === threadId)
        ? prev.filter((item) => item.threadId !== threadId)
        : [...prev, { threadId, preview }]
    );
  }, [sortedThreads]);

  const handleComposerSubmit = useCallback(
    async ({ body, attachments }: ComposerSubmitComment) => {
      stopTyping();
      setIsSyncing(true);

      try {
        await fetch("/api/messages/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            body,
            attachments: attachments.map((attachment) => ({
              id: attachment.id,
              name: attachment.name,
              mimeType: attachment.mimeType,
              size: attachment.size,
            })),
          }),
        });

        window.dispatchEvent(new Event("skillpulse:messages-updated"));
      } finally {
        startTransition(() => setIsSyncing(false));
      }
    },
    [conversationId, stopTyping]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {showSearch && (
        <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search messages..."
            className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
            <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
          </button>
        </div>
      )}

      {pinnedMessages.length > 0 && (
        <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2">
          <Pin className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <p className="flex-1 truncate text-xs text-amber-700">
            {pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? "s" : ""}
          </p>
          <button
            onClick={() => setPinnedMessages([])}
            className="text-xs text-amber-600 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span
            className={`h-2 w-2 rounded-full ${status === "connected" ? "bg-green-400" : "bg-amber-400"}`}
          />
          {status === "connected" ? "Live" : "Connecting..."}
          {isSyncing && <span className="ml-1 text-indigo-400">Sending...</span>}
        </div>
        <button
          onClick={() => setShowSearch((prev) => !prev)}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          title="Search messages"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
        {filteredThreads.length === 0 ? (
          <div className="flex h-full min-h-48 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                <Send className="h-5 w-5 text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                {searchQuery ? "No messages match your search" : "No messages yet"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {searchQuery ? "Try a different search term" : "Send the first message below"}
              </p>
            </div>
          </div>
        ) : (
          filteredThreads.flatMap((thread) =>
            thread.comments.map((comment) => {
              const isOwn = comment.userId === self?.id;
              const resolved = userNames[comment.userId];
              const name = isOwn
                ? (self?.info?.name ?? resolved?.name ?? "You")
                : (resolved?.name ?? (comment as any).userInfo?.name ?? comment.userId);
              const avatar = isOwn
                ? (self?.info?.avatar ?? resolved?.avatar ?? null)
                : (resolved?.avatar ?? (comment as any).userInfo?.avatar ?? null);
              const time = new Date(comment.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const bodyText = extractTextFromBody(comment.body);
              const attachmentUrls = extractAttachments(comment);
              const isPinned = pinnedMessages.some((item) => item.threadId === thread.id);

              if (!bodyText && attachmentUrls.length === 0) return null;

              return (
                <div
                  key={comment.id}
                  className={`group flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar — links to profile */}
                  <a
                    href={isOwn ? "/dashboard/settings" : `/profile/${comment.userId}`}
                    className="mt-1 shrink-0 hover:opacity-80 transition-opacity"
                  >
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt={name} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${
                        isOwn ? "bg-indigo-500" : "bg-slate-400"
                      }`}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </a>

                  <div className={`flex max-w-[72%] flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}>
                    <div className={`flex items-center gap-2 px-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                      <a
                        href={isOwn ? "/dashboard/settings" : `/profile/${comment.userId}`}
                        className="text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                      >
                        {name}
                      </a>
                      <span className="text-[10px] text-slate-400">{time}</span>
                      {isPinned && <Pin className="h-3 w-3 text-amber-500" />}
                    </div>

                    {bodyText && (
                      <div className={`break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isOwn
                          ? "rounded-tr-sm bg-indigo-600 text-white"
                          : "rounded-tl-sm bg-slate-100 text-slate-800"
                      }`}>
                        {bodyText}
                      </div>
                    )}

                    {attachmentUrls.map((attachment, index) => (
                      <ChatAttachmentItem
                        key={attachment.id ?? attachment.url ?? `${comment.id}-${index}`}
                        attachment={attachment}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => pinThread(thread.id)}
                    className="hidden h-6 w-6 shrink-0 items-center justify-center self-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:text-amber-500 group-hover:flex"
                    title={isPinned ? "Unpin" : "Pin"}
                  >
                    <Pin className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          ).filter(Boolean)
        )}
        <div ref={messagesEndRef} />
      </div>

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

      {canSendMessages ? (
        <div className="border-t border-slate-100 bg-white px-3 py-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-1 transition-colors focus-within:border-indigo-300 focus-within:bg-white">
            <Composer
              showFormattingControls={false}
              onFocus={announceTyping}
              onBlur={stopTyping}
              onComposerSubmit={handleComposerSubmit}
              overrides={{
                COMPOSER_PLACEHOLDER: isGroupConversation ? "Message the group..." : `Message ${typingLabel}...`,
                COMPOSER_SEND: "Send",
              }}
            />
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-slate-400">
            Press <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to send
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
