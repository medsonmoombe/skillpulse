"use client";

import { useFormStatus } from "react-dom";
import { endLiveRoom } from "@/app/actions/room";
import { Loader2 } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
    >
      {pending && <Loader2 className="h-3 w-3 animate-spin" />}
      {pending ? "Ending..." : "End Session"}
    </button>
  );
}

export function EndSessionInlineButton({ roomId }: { roomId: string }) {
  return (
    <form action={endLiveRoom}>
      <input type="hidden" name="roomId" value={roomId} />
      <SubmitButton />
    </form>
  );
}
