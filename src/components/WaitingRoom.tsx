"use client";

import { bookRoom } from "@/app/actions/booking";
import { activateRoom } from "@/app/actions/roomUtils";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Clock, Users, CheckCircle2, Radio, CalendarClock } from "lucide-react";
import { useActionToast } from "@/lib/use-action-toast";

type ActionState = { success?: boolean; message?: string } | null;

async function bookRoomAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await bookRoom(formData);
    return { success: true, message: "Your spot has been reserved." };
  } catch (error: any) {
    return { success: false, message: error?.message ?? "Could not reserve your spot." };
  }
}

async function activateRoomAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await activateRoom(formData);
    return null;
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return { success: false, message: error?.message ?? "Could not start the session." };
  }
}

function SubmitButton({ label, pendingLabel, variant = "primary" }: {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "host";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-2xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md ${
        variant === "host"
          ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-200 hover:opacity-90"
          : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-200 hover:opacity-90"
      }`}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? pendingLabel : label}
    </button>
  );
}

interface WaitingRoomProps {
  title: string;
  startsAt: Date | null;
  isHost: boolean;
  roomId: string;
  currentBookings: number;
  maxParticipants: number;
  hasBooked: boolean;
}

export function WaitingRoom({ title, startsAt, isHost, roomId, currentBookings, maxParticipants, hasBooked }: WaitingRoomProps) {
  const isFull = currentBookings >= maxParticipants;
  const pct = Math.min((currentBookings / maxParticipants) * 100, 100);
  const [bookingState, bookingAction] = useActionState(bookRoomAction, null);
  const [activationState, activationAction] = useActionState(activateRoomAction, null);
  useActionToast(bookingState);
  useActionToast(activationState);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm space-y-4">

        {/* Header card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* Gradient top */}
          <div className="h-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
              <CalendarClock className="h-8 w-8 text-indigo-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              {startsAt
                ? `Scheduled for ${new Date(startsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
                : "This session hasn't started yet."}
            </p>
          </div>
        </div>

        {/* Capacity card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Users className="h-4 w-4 text-slate-400" />
              Spots Reserved
            </div>
            <span className={`text-sm font-bold ${isFull ? "text-red-600" : "text-indigo-600"}`}>
              {currentBookings} / {maxParticipants}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isFull ? "bg-red-500" : "bg-gradient-to-r from-indigo-500 to-purple-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {isFull && <p className="mt-2 text-xs text-red-500">Session is full</p>}
        </div>

        {/* Action */}
        {isHost ? (
          <form action={activationAction}>
            <input type="hidden" name="roomId" value={roomId} />
            <SubmitButton label="Start Session Now" pendingLabel="Starting…" variant="host" />
          </form>
        ) : hasBooked ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">You're on the list!</p>
              <p className="text-xs text-emerald-600">You'll be admitted when the host starts.</p>
            </div>
          </div>
        ) : isFull ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-center">
            <p className="text-sm font-semibold text-red-700">Session is Full</p>
            <p className="text-xs text-red-500 mt-0.5">All spots have been reserved.</p>
          </div>
        ) : (
          <form action={bookingAction}>
            <input type="hidden" name="roomId" value={roomId} />
            <SubmitButton label="Reserve Your Spot" pendingLabel="Reserving…" />
          </form>
        )}
      </div>
    </div>
  );
}
