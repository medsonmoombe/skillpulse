"use client";

import { useEventListener } from "@liveblocks/react/suspense";
import { useState } from "react";
import { ClosedRoom } from "./ClosedRoom";

interface SessionEventHandlerProps {
  title: string;
  children: React.ReactNode;
}

export function SessionEventHandler({ title, children }: SessionEventHandlerProps) {
  const [isEnded, setIsEnded] = useState(false);

  useEventListener(({ event }: { event: any }) => {
    if (event.type === "SESSION_ENDED") {
      setIsEnded(true);
    }
  });

  if (isEnded) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50">
        <ClosedRoom title={title} status="ended" />
      </div>
    );
  }

  return <>{children}</>;
}
