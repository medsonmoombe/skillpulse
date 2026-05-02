"use client";

import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import { LiveMap, LiveObject } from "@liveblocks/client";
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
      initialStorage={{
        excalidrawState: new LiveObject({ elements: [] }),
        permissions: new LiveMap<string, boolean>(),
        personalBoards: new LiveMap(),
        sharedBoard: new LiveObject({ userId: null as string | null }),
        audioState: new LiveObject({ openMic: false }),
        raisedHands: new LiveMap<string, boolean>(),
        unmuteRequest: new LiveObject({
          targetUserId: null as string | null,
          requestedById: null as string | null,
          requestedByName: null as string | null,
        }),
        shareRequest: new LiveObject({
          targetUserId: null as string | null,
          requestedById: null as string | null,
          requestedByName: null as string | null,
        }),
      }}
    >
      <ClientSideSuspense fallback={null}>
        <SessionEventHandler title={title}>
          {children}
        </SessionEventHandler>
      </ClientSideSuspense>
    </RoomProvider>
  );
}
