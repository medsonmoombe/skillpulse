"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { joinActiveGroupRoom } from "@/app/actions/roomUtils";
import { Loader2, Users } from "lucide-react";
import { useActionToast } from "@/lib/use-action-toast";

type ActionState = { success?: boolean; message?: string } | null;

async function joinActiveGroupRoomAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await joinActiveGroupRoom(formData);
    return null;
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not join the room.",
    };
  }
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
      {pending ? "Joining..." : "Join Group Session"}
    </button>
  );
}

export function GroupRoomEntryCard({
  roomId,
  title,
}: {
  roomId: string;
  title: string;
}) {
  const [state, action] = useActionState(joinActiveGroupRoomAction, null);
  useActionToast(state);

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-950 p-8 text-center">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
          <Users className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="mt-2 text-sm text-slate-400">
          You are approved for this group. Join the live room explicitly to reserve your place and enter cleanly.
        </p>
        <form action={action} className="mt-6">
          <input type="hidden" name="roomId" value={roomId} />
          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
