"use client";

import { useEventListener, useOthers, useBroadcastEvent } from "@liveblocks/react/suspense";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClosedRoom } from "./ClosedRoom";
import { AlertTriangle } from "lucide-react";

const INACTIVITY_MS = 10 * 60 * 1000;   // 10 minutes
const WARNING_MS   =  9 * 60 * 1000;    //  9 minutes — show warning 1 min before auto-end
const TICK_MS      = 10_000;             // check every 10 seconds

interface SessionEventHandlerProps {
  title: string;
  roomId: string;
  isHost: boolean;
  endAt?: Date | null;
  children: React.ReactNode;
}

type SkillPulseWindow = Window & {
  __skillpulseResetActivity?: () => void;
};

type SessionBroadcastEvent =
  | { type: "SESSION_ENDED" }
  | { type: "SESSION_WARNING"; secondsLeft?: number }
  | { type: "ROOM_REACTION"; emoji?: string; userName?: string };

export function SessionEventHandler({ title, roomId, isHost, endAt = null, children }: SessionEventHandlerProps) {
  const [isEnded, setIsEnded]       = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [inactivitySecondsLeft, setInactivitySecondsLeft] = useState(60);
  const [showEndWarning, setShowEndWarning] = useState(false);
  const [endSecondsLeft, setEndSecondsLeft] = useState(60);
  const [reactions, setReactions]   = useState<Array<{ id: string; emoji: string; userName: string }>>([]);

  const lastActivityRef = useRef(0);
  const broadcast = useBroadcastEvent();
  const others = useOthers();
  const endRequestSentRef = useRef(false);
  const endWarningDismissedRef = useRef(false);

  const endSession = useCallback(async () => {
    if (endRequestSentRef.current) return;
    endRequestSentRef.current = true;

    const res = await fetch("/api/rooms/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });

    if (!res.ok) {
      endRequestSentRef.current = false;
      throw new Error("Failed to end session automatically.");
    }

    setIsEnded(true);
  }, [roomId]);

  // ── Reset activity timer on any presence change ──────────────────────────
  const othersCount = others.length;
  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, [othersCount]);

  // Expose a global reset so ExcalidrawApp can call it on board changes
  useEffect(() => {
    const win = window as SkillPulseWindow;
    win.__skillpulseResetActivity = () => {
      lastActivityRef.current = Date.now();
      setShowWarning(false);
    };
    return () => { delete win.__skillpulseResetActivity; };
  }, []);

  // ── Host-only: inactivity watchdog ───────────────────────────────────────
  useEffect(() => {
    if (!isHost) return;

    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;

      if (idle >= INACTIVITY_MS) {
        // Auto-end after inactivity
        clearInterval(interval);
        void endSession().catch(console.error);
        return;
      }

      if (idle >= WARNING_MS) {
        const remaining = Math.ceil((INACTIVITY_MS - idle) / 1000);
        setInactivitySecondsLeft(remaining);
        setShowWarning(true);
        broadcast({ type: "SESSION_WARNING", secondsLeft: remaining });
      } else {
        setShowWarning(false);
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [isHost, endSession, broadcast]);

  // Host-only: hard stop when the scheduled end time is reached
  useEffect(() => {
    if (!endAt) return;

    const target = new Date(endAt).getTime();
    const warningStart = target - 60_000;

    const updateEndWarning = () => {
      const now = Date.now();
      if (now >= target) {
        setShowEndWarning(false);
        return;
      }

      if (now >= warningStart) {
        setEndSecondsLeft(Math.max(0, Math.ceil((target - now) / 1000)));
        if (!endWarningDismissedRef.current) {
          setShowEndWarning(true);
        }
      } else {
        setShowEndWarning(false);
      }
    };

    updateEndWarning();

    const interval = window.setInterval(updateEndWarning, 1000);
    return () => window.clearInterval(interval);
  }, [endAt]);

  // Host-only: hard stop when the scheduled end time is reached
  useEffect(() => {
    if (!isHost || !endAt) return;

    const msUntilEnd = new Date(endAt).getTime() - Date.now();
    if (msUntilEnd <= 0) {
      void endSession().catch(console.error);
      return;
    }

    const timer = window.setTimeout(() => {
      void endSession().catch(console.error);
    }, msUntilEnd);

    return () => window.clearTimeout(timer);
  }, [isHost, endAt, endSession]);

  // Listen for session end event via Liveblocks broadcast
  useEventListener((message: { event?: unknown }) => {
    const event = message.event as SessionBroadcastEvent | undefined;
    if (!event || typeof event !== "object") return;

    if (event.type === "SESSION_ENDED") {
      setIsEnded(true);
      // Trigger lesson-live tracker if applicable
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("lesson-session-ended"));
      }
    }

    if (event.type === "SESSION_WARNING") {
      setInactivitySecondsLeft(event.secondsLeft ?? 60);
      setShowWarning(true);
    }

    if (event.type === "ROOM_REACTION" && event.emoji) {
      // Any reaction = activity
      lastActivityRef.current = Date.now();
      setShowWarning(false);

      const id = `${Date.now()}-${Math.random()}`;
      const emoji = event.emoji;
      const userName = event.userName ?? "Someone";
      setReactions((cur) => [...cur, { id, emoji, userName }]);
    }
  });

  // Auto-dismiss reactions
  useEffect(() => {
    if (reactions.length === 0) return;
    const t = window.setTimeout(() => setReactions((cur) => cur.slice(1)), 2200);
    return () => window.clearTimeout(t);
  }, [reactions]);

  // Dismiss warning when user interacts
  const dismissWarning = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
  }, []);

  const dismissEndWarning = useCallback(() => {
    endWarningDismissedRef.current = true;
    setShowEndWarning(false);
  }, []);

  if (isEnded) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50">
        <ClosedRoom title={title} status="ended" />
      </div>
    );
  }

  return (
    <>
      {children}

      {/* Inactivity warning banner */}
      {showWarning && (
        <div className="pointer-events-auto fixed top-16 left-1/2 -translate-x-1/2 z-[120] w-full max-w-sm px-4">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-950/90 px-4 py-3 text-white shadow-2xl backdrop-blur">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-200">Session ending soon</p>
              <p className="text-xs text-amber-300/80 mt-0.5">
                No activity detected. Session will end in{" "}
                <span className="font-bold text-amber-200">{inactivitySecondsLeft}s</span>.
              </p>
            </div>
            <button
              onClick={dismissWarning}
              className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-400 transition-colors"
            >
              I&apos;m here
            </button>
          </div>
        </div>
      )}

      {showEndWarning && (
        <div className="pointer-events-auto fixed top-32 left-1/2 -translate-x-1/2 z-[119] w-full max-w-sm px-4">
          <div className="flex items-start gap-3 rounded-2xl border border-sky-500/30 bg-sky-950/90 px-4 py-3 text-white shadow-2xl backdrop-blur">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-sky-300" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sky-100">Meeting ending in 1 minute</p>
              <p className="text-xs text-sky-200/80 mt-0.5">
                This session will end automatically in{" "}
                <span className="font-bold text-sky-100">{endSecondsLeft}s</span>.
              </p>
            </div>
            <button
              onClick={dismissEndWarning}
              className="shrink-0 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-sky-950 hover:bg-sky-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Reaction toasts */}
      {reactions.length > 0 && (
        <div className="pointer-events-none fixed right-4 top-20 z-[120] flex flex-col gap-2">
          {reactions.map((r) => (
            <div
              key={r.id}
              className="animate-in slide-in-from-right-4 rounded-2xl border border-white/10 bg-slate-900/90 px-3 py-2 text-white shadow-2xl backdrop-blur"
            >
              <span className="mr-2 text-lg">{r.emoji}</span>
              <span className="text-xs font-semibold">{r.userName}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
