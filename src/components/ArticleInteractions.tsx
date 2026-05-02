"use client";

import { useState, useTransition, useRef } from "react";
import { toggleInteraction, addComment } from "@/app/actions/article";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReactionType = "fire" | "lightbulb" | "heart";

type Comment = {
  id: string;
  content: string;
  authorName: string;
  authorAvatar: string | null;
  createdAt: Date;
};

type Props = {
  articleId: string;
  slug: string;
  isLoggedIn: boolean;
  initialCounts: Record<ReactionType, number>;
  initialUserReactions: Record<ReactionType, boolean>;
  comments: Comment[];
};

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "fire",      emoji: "🔥", label: "Fire"      },
  { type: "lightbulb", emoji: "💡", label: "Insightful" },
  { type: "heart",     emoji: "❤️", label: "Love it"   },
];

export function ArticleInteractions({
  articleId,
  slug,
  isLoggedIn,
  initialCounts,
  initialUserReactions,
  comments: initialComments,
}: Props) {
  const [counts, setCounts] = useState(initialCounts);
  const [userReactions, setUserReactions] = useState(initialUserReactions);
  const [comments, setComments] = useState(initialComments);
  const [commentText, setCommentText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [pendingReaction, setPendingReaction] = useState<ReactionType | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleReaction = (type: ReactionType) => {
    if (!isLoggedIn || isPending) return;
    const wasActive = userReactions[type];

    // Optimistic update
    setCounts((prev) => ({ ...prev, [type]: prev[type] + (wasActive ? -1 : 1) }));
    setUserReactions((prev) => ({ ...prev, [type]: !wasActive }));
    setPendingReaction(type);

    startTransition(async () => {
      try {
        await toggleInteraction(articleId, type, slug);
      } catch {
        // Revert on error
        setCounts((prev) => ({ ...prev, [type]: prev[type] + (wasActive ? 1 : -1) }));
        setUserReactions((prev) => ({ ...prev, [type]: wasActive }));
      } finally {
        setPendingReaction(null);
      }
    });
  };

  const handleComment = async () => {
    if (!commentText.trim() || isSubmittingComment) return;
    const optimisticComment: Comment = {
      id: `optimistic-${Date.now()}`,
      content: commentText.trim(),
      authorName: "You",
      authorAvatar: null,
      createdAt: new Date(),
    };
    setComments((prev) => [...prev, optimisticComment]);
    const text = commentText;
    setCommentText("");
    setIsSubmittingComment(true);
    try {
      await addComment(articleId, text, slug);
    } catch {
      // Revert on error
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
      setCommentText(text);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="mt-12 space-y-8">
      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-100" />
        <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Reactions</span>
        <div className="h-px flex-1 bg-slate-100" />
      </div>

      {/* Reaction buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {REACTIONS.map(({ type, emoji, label }) => {
          const active = userReactions[type];
          const loading = pendingReaction === type && isPending;
          return (
            <button
              key={type}
              onClick={() => handleReaction(type)}
              disabled={!isLoggedIn || (isPending && pendingReaction === type)}
              title={isLoggedIn ? label : "Sign in to react"}
              className={`group flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                active
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm"
                  : isLoggedIn
                  ? "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                  : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
              }`}
            >
              <span className={`text-base transition-transform duration-150 ${active ? "scale-110" : "group-hover:scale-110"}`}>
                {emoji}
              </span>
              <span>{counts[type] > 0 ? counts[type] : label}</span>
              {loading && <Loader2 className="h-3 w-3 animate-spin opacity-60" />}
            </button>
          );
        })}

        {/* Comment count pill */}
        <div className="ml-auto flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500">
          <MessageSquare className="h-4 w-4" />
          <span>{comments.length} {comments.length === 1 ? "comment" : "comments"}</span>
        </div>
      </div>

      {!isLoggedIn && (
        <p className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          <a href="/dashboard" className="font-medium text-indigo-600 hover:underline">Sign in</a> to react and leave a comment.
        </p>
      )}

      {/* Comments section */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-100" />
          <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Comments</span>
          <div className="h-px flex-1 bg-slate-100" />
        </div>

        {/* Comment input */}
        {isLoggedIn && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleComment();
              }}
              placeholder="Share your thoughts on this article…"
              rows={3}
              className="w-full resize-none px-4 pt-4 pb-2 text-sm text-slate-700 placeholder:text-slate-300 outline-none"
            />
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2">
              <span className="text-[11px] text-slate-400">⌘ + Enter to submit</span>
              <Button
                size="sm"
                onClick={handleComment}
                disabled={!commentText.trim() || isSubmittingComment}
                className="gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 shadow-sm hover:opacity-90"
              >
                {isSubmittingComment ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Post
              </Button>
            </div>
          </div>
        )}

        {/* Comment list */}
        {comments.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-100 py-10 text-center">
            <MessageSquare className="mx-auto mb-2 h-7 w-7 text-slate-200" />
            <p className="text-sm font-medium text-slate-400">No comments yet</p>
            <p className="mt-0.5 text-xs text-slate-300">Be the first to share your thoughts.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-bold text-white">
                  {comment.authorAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={comment.authorAvatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    comment.authorName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 overflow-hidden rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-4 py-3 shadow-sm">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800">{comment.authorName}</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(comment.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
