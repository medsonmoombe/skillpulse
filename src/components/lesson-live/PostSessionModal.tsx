"use client";

/**
 * PostSessionModal — shown to learners after a lesson_live session ends.
 * Submits rating + optional comment to POST /api/session-feedback.
 * Optionally also applies rating to expert profile.
 */

import { useState } from "react";
import { Star, X, Loader2, CheckCircle2 } from "lucide-react";

export function PostSessionModal({
  roomId,
  sessionTitle,
  onClose,
}: {
  roomId: string;
  sessionTitle: string;
  onClose: () => void;
}) {
  const [rating, setRating]   = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [applyToProfile, setApplyToProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function submit() {
    if (rating === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/session-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, rating, comment: comment.trim() || null, applyToExpertProfile: applyToProfile }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Failed to submit feedback");
      }
      setDone(true);
      setTimeout(onClose, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-slate-900">Rate this session</p>
            <p className="mt-0.5 text-xs text-slate-500 truncate max-w-[220px]">{sessionTitle}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <CheckCircle2 size={40} className="text-green-500" />
            <p className="text-sm font-semibold text-slate-900">Thanks for your feedback!</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Stars */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(s)}
                  className="transition"
                >
                  <Star
                    size={32}
                    className={`transition ${
                      s <= (hovered || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-200"
                    }`}
                  />
                </button>
              ))}
            </div>

            {rating > 0 && (
              <p className="text-center text-xs font-semibold text-slate-600">
                {["", "Poor", "Fair", "Good", "Great", "Excellent"][rating]}
              </p>
            )}

            {/* Comment */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comment…"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
            />

            {/* Apply to expert profile */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setApplyToProfile((v) => !v)}
                className={`h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition ${
                  applyToProfile ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                }`}
              >
                {applyToProfile && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
              <span className="text-xs text-slate-600">Also apply rating to expert&apos;s profile</span>
            </label>

            {error && <p className="text-xs text-rose-600">{error}</p>}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600">
                Skip
              </button>
              <button
                onClick={submit}
                disabled={loading || rating === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50 shadow-sm shadow-indigo-500/20"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                Submit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
