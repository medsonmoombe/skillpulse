"use client";

import { useState, useCallback } from "react";
import { ExcalidrawCanvas } from "./ExcalidrawCanvas";
import { RoomToolbar } from "./RoomToolbar";

interface ActiveRoomProps {
  roomId: string;
  livekitRoomId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole?: string;
  isHost: boolean;
  admittedUsers: { id: string; name: string | null }[];
}

export function ActiveRoom({ roomId, livekitRoomId, currentUserId, currentUserName, currentUserRole = "learner", isHost, admittedUsers }: ActiveRoomProps) {
  const [showBoardControl, setShowBoardControl] = useState(false);

  const [boardCallbacks, setBoardCallbacks] = useState<{
    onViewBoard?: (userId: string) => void;
    onShareBoard?: (userId: string) => void;
    onRequestShare?: (userId: string) => void;
  }>({});

  const registerCallbacks = useCallback((cbs: typeof boardCallbacks) => {
    setBoardCallbacks((prev) => {
      if (
        prev.onViewBoard === cbs.onViewBoard &&
        prev.onShareBoard === cbs.onShareBoard &&
        prev.onRequestShare === cbs.onRequestShare
      ) {
        return prev;
      }

      return cbs;
    });
  }, []);

  return (
    <div className="flex flex-col w-full h-full">
      {/* Board — fills all remaining space above the toolbar */}
      <div className="flex-1 relative min-h-0">
        <ExcalidrawCanvas
          roomId={roomId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          isHost={isHost}
          admittedUsers={admittedUsers}
          showBoardControl={showBoardControl}
          onRegisterCallbacks={registerCallbacks}
        />
      </div>

      {/* Toolbar — always visible at bottom, never scrolls away */}
      <div className="shrink-0">
        <RoomToolbar
          livekitRoomId={livekitRoomId}
          roomId={roomId}
          isHost={isHost}
          showBoardControl={showBoardControl}
          onBoardControlToggle={() => setShowBoardControl(p => !p)}
          admittedUsers={admittedUsers}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserRole={currentUserRole}
          onViewBoard={boardCallbacks.onViewBoard}
          onShareBoard={boardCallbacks.onShareBoard}
          onRequestShare={boardCallbacks.onRequestShare}
        />
      </div>
    </div>
  );
}
