"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { startLiveRoom } from "@/app/actions/room";
import { Loader2, Radio } from "lucide-react";
import { useActionToast } from "@/lib/use-action-toast";

interface GoLiveButtonProps {
  groupId?: string;
}

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

export function GoLiveButton({ groupId }: GoLiveButtonProps) {
  const [state, formAction] = useActionState(startLiveRoomAction, null);
  useActionToast(state);

  return (
    <div className="px-3 pb-3">
      <form action={formAction}>
        <input type="hidden" name="title" value="Live Help Session" />
        {groupId && <input type="hidden" name="groupId" value={groupId} />}
        <SubmitButton />
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-500/20 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
    >
      {pending ? <Loader2 size={13} className="animate-spin" /> : <Radio size={13} />}
      {pending ? "Starting..." : "Go Live Now"}
    </button>
  );
}
