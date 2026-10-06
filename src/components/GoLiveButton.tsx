"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { startLiveRoom } from "@/app/actions/room";
import { Loader2, Radio } from "lucide-react";
import { useActionToast } from "@/lib/use-action-toast";

type ActionState = { success?: boolean; message?: string } | null;

async function startLiveRoomAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await startLiveRoom(formData);
    return null;
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { success: false, message: error?.message ?? "Could not start the live session." };
  }
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-200 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <Loader2 size={13} className="animate-spin" /> : <Radio size={13} />}
      {pending ? "Starting…" : "Go Live"}
    </button>
  );
}

export function GoLiveButton({ groupId }: { groupId?: string }) {
  const [state, formAction] = useActionState(startLiveRoomAction, null);
  const [title, setTitle] = useState("");
  useActionToast(state);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="groupId" value={groupId ?? ""} />
      <input
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Session title…"
        required
        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
      />
      <SubmitButton />
    </form>
  );
}
