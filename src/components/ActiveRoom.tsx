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
    setBoardCallbacks(cbs);
  }, []);

  return (
    // Outer container — relative so the side drawer can cover board + toolbar
    <div className="absolute inset-0 flex flex-col bg-white">

      {/* Board — takes all space above the toolbar */}
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

      {/* Toolbar — fixed height bar, never overlaps the board */}
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
  );
}
