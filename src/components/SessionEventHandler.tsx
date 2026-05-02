"use client";

import { useEventListener } from "@liveblocks/react/suspense";
import { useEffect, useState } from "react";
import { ClosedRoom } from "./ClosedRoom";

interface SessionEventHandlerProps {
  title: string;
  children: React.ReactNode;
}

export function SessionEventHandler({ title, children }: SessionEventHandlerProps) {
  const [isEnded, setIsEnded] = useState(false);
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; userName: string }>>([]);

  useEventListener(({ event }: { event: any }) => {
    if (event.type === "SESSION_ENDED") {
      setIsEnded(true);
    }

    if (event.type === "ROOM_REACTION" && event.emoji) {
      const id = `${Date.now()}-${Math.random()}`;
      setReactions((current) => [...current, { id, emoji: event.emoji, userName: event.userName ?? "Someone" }]);
    }
  });

  useEffect(() => {
    if (reactions.length === 0) return;

    const timer = window.setTimeout(() => {
      setReactions((current) => current.slice(1));
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [reactions]);

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
      {reactions.length > 0 ? (
        <div className="pointer-events-none fixed right-4 top-20 z-[120] flex flex-col gap-2">
          {reactions.map((reaction) => (
            <div
              key={reaction.id}
              className="animate-in slide-in-from-right-4 rounded-2xl border border-white/10 bg-slate-900/90 px-3 py-2 text-white shadow-2xl backdrop-blur"
            >
              <span className="mr-2 text-lg">{reaction.emoji}</span>
              <span className="text-xs font-semibold">{reaction.userName}</span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
