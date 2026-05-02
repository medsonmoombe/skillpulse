"use client";

import { useState } from "react";
import { ExcalidrawCanvas } from "./ExcalidrawCanvas";
import { RoomToolbar } from "./RoomToolbar";

interface LiveRoomBoardProps {
  roomId: string;
  livekitRoomId: string;
  currentUserId: string;
  currentUserName: string;
  isHost: boolean;
  admittedUsers: { id: string; name: string | null }[];
}

export function LiveRoomBoard({
  roomId,
  livekitRoomId,
  currentUserId,
  currentUserName,
  isHost,
  admittedUsers,
}: LiveRoomBoardProps) {
  const [showBoardControl, setShowBoardControl] = useState(false);

  return (
    <div className="absolute inset-0 bg-white">
      <ExcalidrawCanvas
        roomId={roomId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        isHost={isHost}
        admittedUsers={admittedUsers}
        showBoardControl={showBoardControl}
      />
      <RoomToolbar
        livekitRoomId={livekitRoomId}
        roomId={roomId}
        isHost={isHost}
        showBoardControl={showBoardControl}
        onBoardControlToggle={() => setShowBoardControl(prev => !prev)}
      />
    </div>
  );
}
