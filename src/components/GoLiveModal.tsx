"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { startLiveRoom } from "@/app/actions/room";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Radio, Loader2 } from "lucide-react";

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

export function GoLiveModal({ groupId }: { groupId?: string }) {
  const [mode, setMode] = useState<"instant" | "scheduled">("instant");
  const [open, setOpen] = useState(false);

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

        <form action={startLiveRoom} className="space-y-5 mt-1">
          <input type="hidden" name="mode" value={mode} />
          {groupId && <input type="hidden" name="groupId" value={groupId} />}

          {/* Mode toggle */}
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

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Session Title</Label>
            <Input id="title" name="title" placeholder="e.g., Calculus Homework Help" required />
          </div>

          {/* Auto-Admit toggle */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <Label htmlFor="autoAdmit" className="text-sm cursor-pointer">Auto-Admit</Label>
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

          {/* Scheduling fields */}
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
