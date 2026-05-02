"use client";

import { useEffect, useRef, useState } from "react";
import { useOthers, useStorage } from "@liveblocks/react/suspense";
import { Mic, X, Pencil, Users, LayoutPanelLeft, Share2 } from "lucide-react";
import { LiveRoomView } from "./LiveRoomView";

type DrawerType = "audio" | "participants" | "board" | null;

interface RoomToolbarProps {
  livekitRoomId: string;
  roomId: string;
  isHost?: boolean;
  showBoardControl?: boolean;
  onBoardControlToggle?: () => void;
  admittedUsers?: { id: string; name: string | null }[];
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: string;
  onViewBoard?: (userId: string) => void;
  onShareBoard?: (userId: string) => void;
  onRequestShare?: (userId: string) => void;
}

export function RoomToolbar({
  livekitRoomId,
  roomId,
  isHost = false,
  showBoardControl = false,
  onBoardControlToggle,
  admittedUsers = [],
  currentUserId = "",
  currentUserName = "",
  currentUserRole = "learner",
  onViewBoard,
  onShareBoard,
  onRequestShare,
}: RoomToolbarProps) {
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const others = useOthers();
  const raisedHands = useStorage((root) => (root as any).raisedHands ?? {});
  const previousParticipantCountRef = useRef<number>(0);
  const previousRaisedHandCountRef = useRef<number>(0);

  const toggle = (drawer: DrawerType) =>
    setActiveDrawer((prev) => (prev === drawer ? null : drawer));

  const playAlertTone = (tones: Array<{ frequency: number; duration: number; delay?: number }>) => {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const context = new AudioCtx();
    const start = context.currentTime;

    tones.forEach(({ frequency, duration, delay = 0 }) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start + delay);

      gain.gain.setValueAtTime(0.0001, start + delay);
      gain.gain.exponentialRampToValueAtTime(0.16, start + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + duration);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start + delay);
      oscillator.stop(start + delay + duration + 0.02);
    });

    const totalDuration = Math.max(...tones.map((tone) => (tone.delay ?? 0) + tone.duration), 0);
    window.setTimeout(() => {
      context.close().catch(() => {});
    }, Math.ceil((totalDuration + 0.2) * 1000));
  };

  const realtimeParticipants = [
    { id: currentUserId, name: currentUserName || "You" },
    ...others.map((other) => ({
      id: String(other.id),
      name: ((other.info as { name?: string } | undefined)?.name ?? "User") as string,
    })),
  ].filter((participant, index, arr) => participant.id && arr.findIndex((item) => item.id === participant.id) === index);

  const visibleParticipants = realtimeParticipants.length > 0 ? realtimeParticipants : admittedUsers;
  const raisedHandCount = Object.values(raisedHands as Record<string, boolean>).filter(Boolean).length;
  const audioBadgeCount = isHost ? raisedHandCount : undefined;

  useEffect(() => {
    const currentCount = visibleParticipants.length;
    if (previousParticipantCountRef.current === 0) {
      previousParticipantCountRef.current = currentCount;
      return;
    }

    if (currentCount > previousParticipantCountRef.current) {
      playAlertTone([
        { frequency: 185, duration: 0.18 },
        { frequency: 247, duration: 0.22, delay: 0.14 },
      ]);
    } else if (currentCount < previousParticipantCountRef.current) {
      playAlertTone([
        { frequency: 247, duration: 0.16 },
        { frequency: 196, duration: 0.18, delay: 0.1 },
      ]);
    }

    previousParticipantCountRef.current = currentCount;
  }, [visibleParticipants.length]);

  useEffect(() => {
    if (!isHost) return;

    if (previousRaisedHandCountRef.current === 0) {
      previousRaisedHandCountRef.current = raisedHandCount;
      return;
    }

    if (raisedHandCount > previousRaisedHandCountRef.current) {
      playAlertTone([
        { frequency: 523, duration: 0.12 },
        { frequency: 659, duration: 0.14, delay: 0.12 },
        { frequency: 784, duration: 0.18, delay: 0.24 },
      ]);
    }

    previousRaisedHandCountRef.current = raisedHandCount;
  }, [isHost, raisedHandCount]);

  const drawerTitle: Record<string, string> = {
    audio: "Audio",
    participants: "Participants",
    board: "Board Control",
  };

  return (
    <>
      {/* Side Drawer — fixed to viewport so it covers board + toolbar */}
      <div
        className={`fixed top-0 right-0 h-full bg-slate-900 border-l border-slate-800 flex flex-col z-50 shadow-2xl transition-transform duration-200
          w-full sm:w-72
          ${activeDrawer ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Drawer header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <span className="text-sm font-semibold text-slate-200">
            {activeDrawer ? drawerTitle[activeDrawer] : ""}
          </span>
          <button
            onClick={() => setActiveDrawer(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Audio panel — always mounted, hidden when not active */}
        <div className={`flex-1 overflow-hidden ${activeDrawer === "audio" ? "flex flex-col" : "hidden"}`}>
          <LiveRoomView
            livekitRoomId={livekitRoomId}
            roomId={roomId}
            isHost={isHost}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserRole={currentUserRole}
          />
        </div>

        {/* Participants panel */}
        {activeDrawer === "participants" && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {visibleParticipants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-8 w-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-500">No participants yet</p>
              </div>
            ) : (
              visibleParticipants.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5 bg-slate-800 border border-slate-700 px-3 py-2.5 rounded-xl">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {(u.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate font-medium">{u.name || "User"}</p>
                    <p className="text-[10px] text-slate-500">{u.id === currentUserId ? "You" : "Participant"}</p>
                  </div>
                  {/* Host actions per participant */}
                  {isHost && u.id !== currentUserId && (
                    <div className="flex items-center gap-1 shrink-0">
                      {onViewBoard && (
                        <button onClick={() => { onViewBoard(u.id); setActiveDrawer(null); }}
                          title="View their board"
                          className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
                          <LayoutPanelLeft className="h-3 w-3" />
                        </button>
                      )}
                      {onShareBoard && (
                        <button onClick={() => { onShareBoard(u.id); setActiveDrawer(null); }}
                          title="Share their board to all"
                          className="p-1.5 rounded-lg bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900 transition-colors">
                          <Share2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Board control panel */}
        {activeDrawer === "board" && isHost && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest px-1 mb-3">Grant / Revoke draw access</p>
            {visibleParticipants.filter((u) => u.id !== currentUserId).length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No participants to manage</p>
            ) : (
              visibleParticipants
                .filter((u) => u.id !== currentUserId)
                .map((u) => (
                  <div key={u.id} className="flex items-center gap-2.5 bg-slate-800 border border-slate-700 px-3 py-2.5 rounded-xl">
                    <div className="h-7 w-7 rounded-full bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-200 shrink-0">
                      {(u.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-200 truncate flex-1">{u.name || "User"}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {onViewBoard && (
                        <button onClick={() => { onViewBoard(u.id); setActiveDrawer(null); }}
                          title="View board" className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
                          <LayoutPanelLeft className="h-3 w-3" />
                        </button>
                      )}
                      {onShareBoard && (
                        <button onClick={() => { onShareBoard(u.id); setActiveDrawer(null); }}
                          title="Share to all" className="p-1.5 rounded-lg bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900 transition-colors">
                          <Share2 className="h-3 w-3" />
                        </button>
                      )}
                      {onRequestShare && (
                        <button onClick={() => onRequestShare(u.id)}
                          title="Request share" className="p-1.5 rounded-lg bg-indigo-900/50 text-indigo-400 hover:bg-indigo-900 transition-colors">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className="relative z-30 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 shadow-xl">

        {/* Audio */}
        <ToolbarButton
          icon={<Mic className="h-4 w-4" />}
          label="Audio"
          active={activeDrawer === "audio"}
          badge={audioBadgeCount}
          onClick={() => toggle("audio")}
        />

        {/* Participants */}
        <ToolbarButton
          icon={<Users className="h-4 w-4" />}
          label="Participants"
          active={activeDrawer === "participants"}
          badge={visibleParticipants.length > 0 ? visibleParticipants.length : undefined}
          onClick={() => toggle("participants")}
        />

        {/* Board Control — host only */}
        {isHost && (
          <ToolbarButton
            icon={<Pencil className="h-4 w-4" />}
            label="Board Control"
            active={activeDrawer === "board" || showBoardControl}
            onClick={() => {
              toggle("board");
              // Also toggle the side panel in ExcalidrawCanvas
              if (activeDrawer !== "board") onBoardControlToggle?.();
            }}
          />
        )}

        {/* Personal Board toggle — passed up via onBoardControlToggle for non-host */}
        {!isHost && (
          <ToolbarButton
            icon={<LayoutPanelLeft className="h-4 w-4" />}
            label="My Board"
            active={showBoardControl}
            onClick={() => onBoardControlToggle?.()}
          />
        )}
      </div>
    </>
  );
}

function ToolbarButton({
  icon, label, active, onClick, badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative flex items-center justify-center h-9 w-9 rounded-xl transition-colors ${
        active ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700"
      }`}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-indigo-500 border border-slate-900 flex items-center justify-center text-[9px] font-bold text-white px-0.5">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}
