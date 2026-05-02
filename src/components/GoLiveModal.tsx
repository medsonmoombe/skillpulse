"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { startLiveRoom } from "@/app/actions/room";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Radio } from "lucide-react";
import { useActionToast } from "@/lib/use-action-toast";

type ActionState = { error?: string } | null;

async function startLiveRoomAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await startLiveRoom(formData);
    return null;
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: error?.message ?? "Something went wrong. Please try again." };
  }
}

function SubmitButton({ mode }: { mode: "instant" | "scheduled" }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Please wait..." : mode === "instant" ? "Start Now" : "Schedule Session"}
    </button>
  );
}

export function GoLiveModal({
  groupId,
  userRole,
  disabled,
}: {
  groupId?: string;
  userRole?: string;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<"instant" | "scheduled">("instant");
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(startLiveRoomAction, null);

  useActionToast(state && state.error ? { success: false, message: state.error } : null);

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="w-full flex flex-col items-center gap-1 px-3 py-2.5 bg-slate-100 rounded-lg border border-slate-200 cursor-not-allowed"
      >
        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
          <Radio size={13} />
          Go Live Now
        </div>
        <p className="text-[10px] text-slate-400 text-center leading-tight">
          Daily limit reached. Resets at midnight.
        </p>
      </button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-500/20 hover:opacity-90 transition-all">
          <Radio size={13} />
          Go Live Now
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Start a Session</DialogTitle>
        </DialogHeader>

        {state?.error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <form action={formAction} className="space-y-5 mt-1">
          <input type="hidden" name="mode" value={mode} />
          {groupId && <input type="hidden" name="groupId" value={groupId} />}

          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setMode("instant")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "instant" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              Instant
            </button>
            <button
              type="button"
              onClick={() => setMode("scheduled")}
              className={`flex-1 py-2 text-sm font-medium border-l border-slate-200 transition-colors ${mode === "scheduled" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              Schedule
            </button>
          </div>

          {userRole === "learner" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Learners can go live up to <strong>3 times per day</strong>. Limit resets at midnight.
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title">Session Title</Label>
            <Input id="title" name="title" placeholder="e.g., Calculus Homework Help" required />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <Label htmlFor="autoAdmit" className="text-sm cursor-pointer">
                Auto-Admit
              </Label>
              <p className="text-xs text-slate-500 mt-0.5">Let users join instantly without waiting.</p>
            </div>
            <input
              id="autoAdmit"
              name="autoAdmit"
              type="checkbox"
              defaultChecked={mode === "instant"}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {mode === "scheduled" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="startsAt">Start Time</Label>
                <Input id="startsAt" name="startsAt" type="datetime-local" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endsAt">End Time (Optional)</Label>
                <Input id="endsAt" name="endsAt" type="datetime-local" />
              </div>
            </div>
          )}

          <SubmitButton mode={mode} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
