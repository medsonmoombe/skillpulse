"use client";

/**
 * PartialAttendanceBanner — shown to learners after a lesson_live session
 * when their attendance was partial (didn't meet the 80% threshold).
 * Offers "Mark complete anyway" via POST /api/rooms/completion.
 */

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export function PartialAttendanceBanner({
  roomId,
  onMarked,
}: {
  roomId: string;
  onMarked?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function markComplete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms/completion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, markComplete: true }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Failed to mark complete");
      }
      setDone(true);
      onMarked?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle2 size={15} className="text-green-600 shrink-0" />
        <p className="text-sm font-semibold text-green-800">Lesson marked as complete.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-600" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900">You didn&apos;t finish this lesson</p>
          <p className="mt-0.5 text-xs text-amber-700">
            Your attendance was below the completion threshold. You can mark it complete manually if you feel ready.
          </p>
          {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>
        <button
          onClick={markComplete}
          disabled={loading}
          className="shrink-0 flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
          Mark complete
        </button>
      </div>
    </div>
  );
}
