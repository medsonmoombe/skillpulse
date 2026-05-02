"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { admitUser, admitAll } from "@/app/actions/admit";
import { Loader2, UserCheck, Users, CheckCheck } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

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

export function AdmitPanel({ roomId, bookings }: AdmitPanelProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const waiting = bookings.filter((b) => b.status === "booked");
  const admitted = bookings.filter((b) => b.status === "admitted");

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(interval);
  }, [router]);

  const handleAdmit = (booking: Booking) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("bookingId", booking.id);
      formData.set("roomId", roomId);
      setPendingId(booking.id);
      try {
        await admitUser(formData);
        showToast(`${booking.userName || "Participant"} admitted successfully.`, "success");
        router.refresh();
      } catch (error) {
        console.error("[AdmitPanel] admit error:", error);
        showToast("Could not admit participant. Please try again.", "error");
      } finally {
        setPendingId(null);
      }
    });
  };

  const handleAdmitAll = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("roomId", roomId);
      setPendingId("all");
      try {
        await admitAll(formData);
        showToast("All waiting participants were admitted.", "success");
        router.refresh();
      } catch (error) {
        console.error("[AdmitPanel] admitAll error:", error);
        showToast("Could not admit participants. Please try again.", "error");
      } finally {
        setPendingId(null);
      }
    });
  };

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
        {waiting.length > 1 && (
          <button
            type="button"
            onClick={handleAdmitAll}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {isPending && pendingId === "all" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
            {isPending && pendingId === "all" ? "Admitting all..." : `Admit All (${waiting.length})`}
          </button>
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
              <button
                type="button"
                onClick={() => handleAdmit(booking)}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {isPending && pendingId === booking.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
                {isPending && pendingId === booking.id ? "Admitting..." : "Admit"}
              </button>
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
