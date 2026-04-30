"use client";

import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import { LiveObject } from "@liveblocks/client";
import { SessionEventHandler } from "./SessionEventHandler";

interface RoomShellProps {
  roomId: string;
  title: string;
  children: React.ReactNode;
}

export function RoomShell({ roomId, title, children }: RoomShellProps) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{}}
      initialStorage={{ excalidrawState: new LiveObject({ elements: [] }) }}
    >
      <ClientSideSuspense fallback={null}>
        <SessionEventHandler title={title}>
          {children}
        </SessionEventHandler>
      </ClientSideSuspense>
    </RoomProvider>
  );
}
