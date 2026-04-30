"use client";

import { useState } from "react";
import { Mic, X, Pencil } from "lucide-react";
import { LiveRoomView } from "./LiveRoomView";

type DrawerType = "audio" | null;

interface RoomToolbarProps {
  livekitRoomId: string;
  roomId: string;
  isHost?: boolean;
  showBoardControl?: boolean;
  onBoardControlToggle?: () => void;
}

export function RoomToolbar({
  livekitRoomId,
  roomId,
  isHost = false,
  showBoardControl = false,
  onBoardControlToggle,
}: RoomToolbarProps) {
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);

  return (
    <>
      {/* Audio Drawer — always mounted so connection persists */}
      <div
        className={`absolute top-0 right-0 h-full w-72 max-w-[85vw] bg-slate-900 border-l border-slate-800 flex flex-col z-20 shadow-2xl transition-transform duration-200 ${
          activeDrawer === "audio" ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <span className="text-sm font-semibold text-slate-200">Audio</span>
          <button
            onClick={() => setActiveDrawer(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <LiveRoomView livekitRoomId={livekitRoomId} roomId={roomId} isHost={isHost} />
        </div>
      </div>

      {/* Bottom Toolbar */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1.5 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl shadow-xl">
        <ToolbarButton
          icon={<Mic className="h-4 w-4" />}
          label="Audio"
          active={activeDrawer === "audio"}
          onClick={() => setActiveDrawer(prev => prev === "audio" ? null : "audio")}
        />
        {isHost && (
          <ToolbarButton
            icon={<Pencil className="h-4 w-4" />}
            label="Board Control"
            active={showBoardControl}
            onClick={() => onBoardControlToggle?.()}
          />
        )}
      </div>
    </>
  );
}

function ToolbarButton({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center justify-center h-8 w-8 rounded-lg transition-colors ${
        active ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"
      }`}
    >
      {icon}
    </button>
  );
}
