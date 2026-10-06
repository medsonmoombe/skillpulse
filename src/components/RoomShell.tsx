"use client";

import { RoomProvider, ClientSideSuspense } from "@liveblocks/react/suspense";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { SessionEventHandler } from "./SessionEventHandler";

interface RoomShellProps {
  roomId: string;
  title: string;
  agenda?: string[];
  skillLevel?: string | null;
  isHost?: boolean;
  endAt?: Date | null;
  children: React.ReactNode;
}

export function RoomShell({ roomId, title, agenda = [], skillLevel, isHost = false, endAt = null, children }: RoomShellProps) {
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
        // Session brief — seeded from DB, editable by host during session
        sessionBrief: new LiveObject({
          agenda: agenda as string[],
          skillLevel: (skillLevel ?? "general") as string,
          checkedItems: [] as string[],
          notes: "",
        }),
        // Shared files — images and documents broadcast to all participants
        sessionFiles: new LiveList<{
          id: string;
          name: string;
          url: string;
          type: string;
          size: number;
          uploadedBy: string;
          uploadedByName: string;
          allowDownload: boolean;
          uploadedAt: string;
        }>([]),
        excalidrawFiles: new LiveObject({}),
      }}
    >
      <ClientSideSuspense fallback={null}>
        <SessionEventHandler title={title} roomId={roomId} isHost={isHost} endAt={endAt}>
          {children}
        </SessionEventHandler>
      </ClientSideSuspense>
    </RoomProvider>
  );
}
