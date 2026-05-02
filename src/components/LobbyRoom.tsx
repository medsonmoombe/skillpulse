"use client";

import { RoomProvider } from "@liveblocks/react/suspense";
import { useEventListener } from "@liveblocks/react/suspense";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { admitUser, admitAll } from "@/app/actions/admit";
import { useFormStatus } from "react-dom";
import { Loader2, UserCheck, Users, CheckCheck } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

type Booking = {
  id: string;
  userId: string;
  status: string;
  userName: string | null;
};

// ─── Lobby (for waiting users) ───────────────────────────────────────────────

function LobbyInner({ hostName, userId }: { hostName: string | null; userId: string }) {
  const router = useRouter();
  const [admitted, setAdmitted] = useState(false);

  useEventListener(({ event }: { event: any }) => {
    if (event.type === "ADMIT" && event.userId === userId) {
      setAdmitted(true);
      router.refresh();
    }
  });

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-8 text-center">
      <div className="max-w-sm w-full">
        <div className="relative h-24 w-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
          <div className="relative h-24 w-24 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-amber-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Waiting to be admitted</h2>
        <p className="text-slate-400 text-sm mb-8">
          {hostName ? `${hostName} will let you in soon.` : "The host will let you in soon."}
        </p>
        {admitted ? (
          <p className="text-indigo-400 font-semibold animate-pulse">You've been admitted! Loading room...</p>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" />
          </div>
        )}
        <p className="text-xs text-slate-600 mt-8">You'll be admitted automatically — no need to refresh.</p>
      </div>
    </div>
  );
}

// ─── AdmitPanel (for host) ────────────────────────────────────────────────────

function AdmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors">
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
      {pending ? "Admitting..." : "Admit"}
    </button>
  );
}

function AdmitAllButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors">
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
      {pending ? "Admitting all..." : `Admit All (${count})`}
    </button>
  );
}

function AdmitPanelInner({ roomId, initialBookings }: { roomId: string; initialBookings: Booking[] }) {
  const [waiting, setWaiting] = useState<Booking[]>(initialBookings.filter(b => b.status === "booked"));
  const [admitted, setAdmitted] = useState<Booking[]>(initialBookings.filter(b => b.status === "admitted"));
  const { showToast } = useToast();

  useEventListener(({ event }: { event: any }) => {
    if (event.type === "KNOCK") {
      setWaiting(prev => {
        if (prev.some(u => u.userId === event.userId)) return prev;
        return [...prev, { id: event.bookingId, userId: event.userId, status: "booked", userName: event.userName }];
      });
    }
  });

  // Hide entirely when no one is waiting
  if (waiting.length === 0) return null;

  const handleAdmit = async (formData: FormData) => {
    const userId = formData.get("userId") as string;
    const userName = waiting.find(u => u.userId === userId)?.userName ?? null;
    try {
      await admitUser(formData);
      setWaiting(prev => prev.filter(u => u.userId !== userId));
      setAdmitted(prev => [...prev, { id: formData.get("bookingId") as string, userId, status: "admitted", userName }]);
      showToast(`${userName || "Participant"} admitted successfully.`, "success");
    } catch (error) {
      console.error("[LobbyRoom] admit error:", error);
      showToast("Could not admit participant. Please try again.", "error");
    }
  };

  const handleAdmitAll = async (formData: FormData) => {
    try {
      await admitAll(formData);
      setAdmitted(prev => [...prev, ...waiting.map(u => ({ ...u, status: "admitted" }))]);
      setWaiting([]);
      showToast("All waiting participants were admitted.", "success");
    } catch (error) {
      console.error("[LobbyRoom] admitAll error:", error);
      showToast("Could not admit participants. Please try again.", "error");
    }
  };

  return (
    <div className="w-64 shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col">
      <div className="shrink-0 px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Waiting ({waiting.length})</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {waiting.length > 1 && (
          <form action={handleAdmitAll}>
            <input type="hidden" name="roomId" value={roomId} />
            <AdmitAllButton count={waiting.length} />
          </form>
        )}
        {waiting.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-8 w-8 text-slate-600 mb-2" />
            <p className="text-xs text-slate-500">No one is waiting</p>
          </div>
        ) : (
          waiting.map(booking => (
            <div key={booking.userId} className="flex items-center justify-between bg-slate-800 border border-slate-700 px-3 py-2.5 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <a href={`/profile/${booking.userId}`} className="h-7 w-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity">
                  <span className="text-xs font-bold text-amber-400">{(booking.userName || "?").charAt(0).toUpperCase()}</span>
                </a>
                <a href={`/profile/${booking.userId}`} className="text-sm text-slate-200 truncate hover:text-indigo-300 transition-colors">{booking.userName || "A Learner"}</a>
              </div>
              <form action={handleAdmit}>
                <input type="hidden" name="bookingId" value={booking.id} />
                <input type="hidden" name="roomId" value={roomId} />
                <input type="hidden" name="userId" value={booking.userId} />
                <AdmitButton />
              </form>
            </div>
          ))
        )}
        {admitted.length > 0 && (
          <>
            <div className="pt-2 pb-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Admitted ({admitted.length})</span>
            </div>
            {admitted.map(booking => (
              <div key={booking.userId} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/50">
                <div className="h-7 w-7 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-green-400">{(booking.userName || "?").charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-sm text-slate-400 truncate">{booking.userName || "A Learner"}</span>
                <UserCheck className="h-3.5 w-3.5 text-green-500 ml-auto shrink-0" />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Public exports wrapped in RoomProvider ───────────────────────────────────

export function Lobby({ roomId, hostName, userId }: { roomId: string; hostName: string | null; userId: string }) {
  return (
    <RoomProvider id={roomId} initialPresence={{}} initialStorage={{}}>
      <LobbyInner hostName={hostName} userId={userId} />
    </RoomProvider>
  );
}

export function AdmitPanel({ roomId, bookings }: { roomId: string; bookings: Booking[] }) {
  return (
    <RoomProvider id={roomId} initialPresence={{}} initialStorage={{}}>
      <AdmitPanelInner roomId={roomId} initialBookings={bookings} />
    </RoomProvider>
  );
}
