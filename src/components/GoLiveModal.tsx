"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { startLiveRoom } from "@/app/actions/room";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ChevronDown, Loader2, Radio, X } from "lucide-react";
import { useActionToast } from "@/lib/use-action-toast";

type ActionState = { error?: string } | null;

async function startLiveRoomAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await startLiveRoom(formData);
    return null;
  } catch (error: unknown) {
    const e = error as { digest?: string; message?: string };
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { error: e?.message ?? "Something went wrong. Please try again." };
  }
}

const SKILL_LEVELS = [
  { value: "general",      label: "General",      desc: "Open to everyone" },
  { value: "beginner",     label: "Beginner",     desc: "No prior knowledge needed" },
  { value: "intermediate", label: "Intermediate", desc: "Some experience required" },
  { value: "advanced",     label: "Advanced",     desc: "Deep expertise expected" },
];

function SubmitButton({ mode }: { mode: "instant" | "scheduled" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
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
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"instant" | "scheduled">("instant");
  const [skillLevel, setSkillLevel] = useState("general");
  const [showOptional, setShowOptional] = useState(false);
  const [state, formAction] = useActionState(startLiveRoomAction, null);

  useActionToast(state && state.error ? { success: false, message: state.error } : null);

  // Animate in/out
  useEffect(() => {
    if (open) {
      // Mount first, then trigger transition on next frame
      setVisible(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
    }
  }, [open]);

  function close() {
    setVisible(false);
    setTimeout(() => setOpen(false), 300);
  }

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
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-500/20 hover:opacity-90 transition-all"
      >
        <Radio size={13} />
        Go Live Now
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={close}
            className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
          />

          {/* Drawer — slides in from right */}
          <div
            className={`fixed top-0 right-0 bottom-0 z-50 bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col w-full sm:w-[420px] ${
              visible ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-bold text-slate-900">Start a Session</h2>
              <button
                onClick={close}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {state?.error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{state.error}</span>
                </div>
              )}

              <form action={formAction} className="space-y-4">
                <input type="hidden" name="mode" value={mode} />
                <input type="hidden" name="skillLevel" value={skillLevel} />
                {groupId && <input type="hidden" name="groupId" value={groupId} />}

                {/* Instant / Schedule toggle */}
                <div className="flex border border-slate-200 rounded-xl overflow-hidden">
                  {(["instant", "scheduled"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                        mode === m ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                      } ${m === "scheduled" ? "border-l border-slate-200" : ""}`}
                    >
                      {m === "instant" ? "Instant" : "Schedule"}
                    </button>
                  ))}
                </div>

                {userRole === "learner" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Learners can go live up to <strong>3 times per day</strong>. Limit resets at midnight.
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="title">Session Title</Label>
                  <Input id="title" name="title" placeholder="e.g., React Hooks Deep Dive" required className="rounded-xl" />
                </div>

                {/* Skill level */}
                <div className="space-y-1.5">
                  <Label>Skill Level</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SKILL_LEVELS.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setSkillLevel(level.value)}
                        className={`text-left px-3 py-2.5 rounded-xl border transition-colors ${
                          skillLevel === level.value
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <p className="font-semibold text-xs">{level.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{level.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional toggle */}
                <button
                  type="button"
                  onClick={() => setShowOptional((p) => !p)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showOptional ? "rotate-180" : ""}`} />
                  {showOptional ? "Hide optional settings" : "Add agenda & settings"}
                </button>

                {showOptional && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="agenda">
                        Agenda <span className="text-slate-400 font-normal">(one item per line)</span>
                      </Label>
                      <textarea
                        id="agenda"
                        name="agenda"
                        rows={3}
                        placeholder={"Intro & goals\nCore concepts\nQ&A"}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
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
                  </div>
                )}

                {/* Scheduled time fields — always visible when mode is scheduled */}
                {mode === "scheduled" && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="startsAt">Start Time</Label>
                      <Input id="startsAt" name="startsAt" type="datetime-local" required className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="endsAt">End Time (Optional)</Label>
                      <Input id="endsAt" name="endsAt" type="datetime-local" className="rounded-xl" />
                    </div>
                  </div>
                )}

                <div className="pt-2 pb-6">
                  <SubmitButton mode={mode} />
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
