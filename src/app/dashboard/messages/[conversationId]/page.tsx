import { Users, ArrowLeft } from "lucide-react";
import { ChatRoom } from "@/components/ChatRoom";
import { MessagesActivityPing } from "@/components/MessagesActivityPing";
import { getCurrentUser } from "@/lib/currentUser";
import {
  getAccessibleConversation,
  getConversationRoomId,
  markConversationRead,
} from "@/lib/messaging";
import { getUserSettingsForPage } from "@/lib/user-settings-compat";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function ConversationPage(
  props: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await props.params;

  const user = await getCurrentUser();
  if (!user) redirect("/");

  // Run all DB calls in parallel
  const [accessibleConversation, viewerSettings] = await Promise.all([
    getAccessibleConversation(conversationId, user.id),
    getUserSettingsForPage(user.id),
  ]);

  if (!accessibleConversation) notFound();

  // Fire-and-forget — don't block rendering on this
  void markConversationRead(conversationId, user.id);

  const { conversation, otherUser, participants } = accessibleConversation;
  const isGroup = conversation.type === "group";

  const title = isGroup
    ? conversation.title ?? "Group conversation"
    : otherUser?.displayName ?? "Conversation";

  const subtitle = isGroup
    ? `${participants.length} member${participants.length === 1 ? "" : "s"}`
    : otherUser?.displayName
      ? `Direct message with ${otherUser.displayName}`
      : "Direct message";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <MessagesActivityPing />

      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
        {/* Mobile back button */}
        <Link
          href="/dashboard/messages"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 md:hidden"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        {/* Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 text-sm font-bold text-white shadow-sm">
          {conversation.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={conversation.imageUrl} alt={title} className="h-full w-full object-cover" />
          ) : isGroup ? (
            <Users className="h-4 w-4" />
          ) : (
            title.charAt(0).toUpperCase()
          )}
        </div>

        {/* Name + subtitle */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
            <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:inline">
              {conversation.type}
            </span>
          </div>
          <p className="truncate text-xs text-slate-400">{subtitle}</p>
        </div>

        {/* Live indicator */}
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="hidden sm:inline">Live</span>
        </div>
      </header>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <ChatRoom
          roomId={getConversationRoomId(conversation.id)}
          conversationId={conversation.id}
          typingLabel={title}
          isGroupConversation={isGroup}
          showTypingIndicators={viewerSettings?.showTypingIndicators ?? true}
          showReadReceipts={viewerSettings?.showReadReceipts ?? true}
          canSendMessages={accessibleConversation.membership?.canMessage !== false}
        />
      </div>
    </div>
  );
}
