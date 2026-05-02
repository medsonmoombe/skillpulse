// src/components/WaitingRoom.tsx
"use client";

import { bookRoom } from "@/app/actions/booking";
import { activateRoom } from "@/app/actions/roomUtils";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
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

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-md"
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
  hasBooked: boolean; // We will pass this from the server
}

export function WaitingRoom({ title, startsAt, isHost, roomId, currentBookings, maxParticipants, hasBooked }: WaitingRoomProps) {
  const isFull = currentBookings >= maxParticipants;
  const [bookingState, bookingAction] = useActionState(bookRoomAction, null);
  const [activationState, activationAction] = useActionState(activateRoomAction, null);
  useActionToast(bookingState);
  useActionToast(activationState);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
      <div className="max-w-md w-full">
        <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-indigo-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
        <p className="text-slate-500 mb-4">
          {startsAt 
            ? `Scheduled for ${new Date(startsAt).toLocaleString()}` 
            : "This session hasn't started yet."}
        </p>

        {/* Capacity Indicator */}
        <div className="mb-6 p-4 bg-white border rounded-lg shadow-sm">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600 font-medium">Spots Reserved</span>
            <span className="font-bold text-indigo-600">{currentBookings} / {maxParticipants}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full" 
              style={{ width: `${(currentBookings / maxParticipants) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Actions */}
        {isHost ? (
          <form action={activationAction}>
            <input type="hidden" name="roomId" value={roomId} />
            <SubmitButton label="Start Session Now" pendingLabel="Starting..." />
          </form>
        ) : hasBooked ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 font-semibold">✅ You're on the list!</p>
            <p className="text-green-600 text-sm">You will be admitted when the host starts.</p>
          </div>
        ) : isFull ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-semibold">Session is Full</p>
            <p className="text-red-500 text-sm">All spots have been reserved.</p>
          </div>
        ) : (
          <form action={bookingAction}>
            <input type="hidden" name="roomId" value={roomId} />
            <SubmitButton label="Reserve Your Spot" pendingLabel="Reserving..." />
          </form>
        )}
      </div>
    </div>
  );
}
