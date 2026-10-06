"use client";

/**
 * LessonLiveButton — expert-only button on a lesson row.
 * Validates the start window (-15min to +30min from scheduledAt).
 * Submits to startLiveRoom server action with sessionType=lesson_live.
 */

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { startLiveRoom } from "@/app/actions/room";
import { Radio, Clock, AlertCircle, Loader2 } from "lucide-react";
import {
  LESSON_LIVE_EARLY_START_MINUTES,
  LESSON_LIVE_LATE_START_MINUTES,
} from "@/lib/lesson-live-window";

type WindowState = "too_early" | "open" | "missed" | "no_schedule";

function getWindowState(scheduledAt: Date | null, now: Date): WindowState {
  if (!scheduledAt) return "no_schedule";
  const scheduledDate = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt);
  const diff = (now.getTime() - scheduledDate.getTime()) / 60000;

  if (diff < -LESSON_LIVE_EARLY_START_MINUTES) return "too_early";
  if (diff > LESSON_LIVE_LATE_START_MINUTES) return "missed";
  return "open";
}

type ActionState = { error?: string } | null;

async function startLessonLiveAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await startLiveRoom(fd);
    return null;
  } catch (err: unknown) {
    const e = err as { digest?: string; message?: string };
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    return { error: e?.message ?? "Failed to start lesson live" };
  }
}

function StartBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20 disabled:opacity-60"
    >
      {pending ? <Loader2 size={12} className="animate-spin" /> : <Radio size={12} />}
      Start Live
    </button>
  );
}

export function LessonLiveButton({
  planId,
  lessonId,
  lessonTitle,
  scheduledAt,
}: {
  planId: string;
  lessonId: string;
  lessonTitle: string;
  scheduledAt: Date | null;
}) {
  const [now, setNow] = useState(() => new Date());
  const [state, formAction] = useActionState(startLessonLiveAction, null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const scheduledDate = scheduledAt ? (scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt)) : null;
  const ws = getWindowState(scheduledDate, now);

  if (ws === "no_schedule") {
    return <span className="text-[11px] italic text-slate-400">No schedule</span>;
  }

  if (ws === "too_early") {
    const mins = Math.ceil((scheduledDate!.getTime() - now.getTime()) / 60000);
    return (
      <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
        <Clock size={10} />
        {mins > 60 ? `in ${Math.ceil(mins / 60)}h` : `in ${mins}m`}
      </span>
    );
  }

  if (ws === "missed") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
        <AlertCircle size={10} /> Missed window
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="mode"        value="instant" />
        <input type="hidden" name="sessionType" value="lesson_live" />
        <input type="hidden" name="planId"      value={planId} />
        <input type="hidden" name="lessonId"    value={lessonId} />
        <input type="hidden" name="title"       value={lessonTitle} />
        {scheduledDate && <input type="hidden" name="startsAt" value={scheduledDate.toISOString()} />}
        <StartBtn />
      </form>
      {state?.error && (
        <p className="max-w-[160px] text-right text-[10px] text-rose-600">{state.error}</p>
      )}
    </div>
  );
}
