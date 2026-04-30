"use client";

import { useFormStatus } from "react-dom";
import { knockOnDoor } from "@/app/actions/knock";
import { Loader2, DoorOpen } from "lucide-react";

function KnockButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-md"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <DoorOpen className="h-4 w-4" />}
      {pending ? "Requesting..." : "Ask to Join"}
    </button>
  );
}

export function KnockScreen({ roomId, title }: { roomId: string; title: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-8 text-center">
      <div className="max-w-sm w-full">
        <div className="h-20 w-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-6">
          <DoorOpen className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-slate-400 text-sm mb-8">
          This session is live. Request to join and the host will let you in.
        </p>
        <form action={knockOnDoor}>
          <input type="hidden" name="roomId" value={roomId} />
          <KnockButton />
        </form>
      </div>
    </div>
  );
}
