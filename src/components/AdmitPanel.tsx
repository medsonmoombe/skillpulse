"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { admitUser, admitAll } from "@/app/actions/admit";
import { Loader2, UserCheck, Users, CheckCheck } from "lucide-react";

type Booking = {
  id: string;
  userId: string;
  status: string;
  userName: string | null;
};

interface AdmitPanelProps {
  roomId: string;
  bookings: Booking[];
}

function AdmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
      {pending ? "Admitting..." : "Admit"}
    </button>
  );
}

function AdmitAllButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
      {pending ? "Admitting all..." : `Admit All (${count})`}
    </button>
  );
}

export function AdmitPanel({ roomId, bookings }: AdmitPanelProps) {
  const router = useRouter();
  const waiting = bookings.filter((b) => b.status === "booked");
  const admitted = bookings.filter((b) => b.status === "admitted");

  // Auto-refresh host's waiting list every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
            Waiting ({waiting.length})
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Admit All */}
        {waiting.length > 1 && (
          <form action={admitAll}>
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
          waiting.map((booking) => (
            <div key={booking.id} className="flex items-center justify-between bg-slate-800 border border-slate-700 px-3 py-2.5 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-amber-400">
                    {(booking.userName || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-slate-200 truncate">{booking.userName || "A Learner"}</span>
              </div>
              <form action={admitUser}>
                <input type="hidden" name="bookingId" value={booking.id} />
                <input type="hidden" name="roomId" value={roomId} />
                <AdmitButton />
              </form>
            </div>
          ))
        )}

        {admitted.length > 0 && (
          <>
            <div className="pt-2 pb-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                Admitted ({admitted.length})
              </span>
            </div>
            {admitted.map((booking) => (
              <div key={booking.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/50">
                <div className="h-7 w-7 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-green-400">
                    {(booking.userName || "?").charAt(0).toUpperCase()}
                  </span>
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
