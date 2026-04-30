"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { LiveObject, LiveMap } from "@liveblocks/client";
import { ExcalidrawApp } from "./ExcalidrawApp";
import { ParticipantPanel } from "./ParticipantPanel";

interface ExcalidrawCanvasProps {
  roomId: string;
  currentUserId: string;
  isHost: boolean;
  admittedUsers: { id: string; name: string | null }[];
  showBoardControl?: boolean;
}

export function ExcalidrawCanvas({ roomId, currentUserId, isHost, admittedUsers, showBoardControl = false }: ExcalidrawCanvasProps) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{ cursor: null, editingText: false }}
      initialStorage={{
        excalidrawState: new LiveObject({ elements: [] }),
        permissions: new LiveMap<string, boolean>([[currentUserId, true]]),
      }}
    >
      <ClientSideSuspense fallback={<div className="h-full w-full bg-slate-50 flex items-center justify-center text-slate-400">Connecting to room...</div>}>
        <div className="h-full w-full flex">
          <div className="flex-1 relative overflow-hidden">
            <ExcalidrawApp currentUserId={currentUserId} isHost={isHost} />
          </div>
          {isHost && showBoardControl && admittedUsers.length > 0 && (
            <ParticipantPanel
              admittedUsers={admittedUsers}
              isHost={isHost}
              currentHostId={currentUserId}
            />
          )}
        </div>
      </ClientSideSuspense>
    </RoomProvider>
  );
}
