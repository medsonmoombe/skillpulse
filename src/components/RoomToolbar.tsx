"use client";

import { useEffect, useRef, useState } from "react";
import { useOthers, useStorage } from "@liveblocks/react/suspense";
import { ClipboardList, FileUp, Mic, X, Pencil, Users, LayoutPanelLeft, Share2 } from "lucide-react";
import { LiveRoomView } from "./LiveRoomView";
import { AgendaPanel } from "./AgendaPanel";
import { FilesPanel } from "./FilesPanel";

type DrawerType = "audio" | "participants" | "board" | "agenda" | "files" | null;

const DRAWER_WIDTH = 320; // px

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
  const [drawerVisible, setDrawerVisible] = useState(false);
  const others = useOthers();
  const raisedHands = useStorage((root) => (root as any).raisedHands ?? {});
  const previousParticipantCountRef = useRef<number>(0);
  const previousRaisedHandCountRef = useRef<number>(0);

  // Smooth open/close
  function openDrawer(drawer: DrawerType) {
    if (activeDrawer === drawer) {
      closeDrawer();
      return;
    }
    setActiveDrawer(drawer);
    requestAnimationFrame(() => requestAnimationFrame(() => setDrawerVisible(true)));
  }

  function closeDrawer() {
    setDrawerVisible(false);
    setTimeout(() => setActiveDrawer(null), 280);
  }

  const playAlertTone = (tones: Array<{ frequency: number; duration: number; delay?: number }>) => {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const context = new AudioCtx();
    const start = context.currentTime;
    tones.forEach(({ frequency, duration, delay = 0 }) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, start + delay);
      gain.gain.setValueAtTime(0.0001, start + delay);
      gain.gain.exponentialRampToValueAtTime(0.16, start + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + duration);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(start + delay);
      osc.stop(start + delay + duration + 0.02);
    });
    const total = Math.max(...tones.map((t) => (t.delay ?? 0) + t.duration), 0);
    window.setTimeout(() => context.close().catch(() => {}), Math.ceil((total + 0.2) * 1000));
  };

  const realtimeParticipants = [
    { id: currentUserId, name: currentUserName || "You" },
    ...others.map((o) => ({
      id: String(o.id),
      name: ((o.info as { name?: string } | undefined)?.name ?? "User") as string,
    })),
  ].filter((p, i, arr) => p.id && arr.findIndex((x) => x.id === p.id) === i);

  const visibleParticipants = realtimeParticipants.length > 0 ? realtimeParticipants : admittedUsers;
  const raisedHandCount = Object.values(raisedHands as Record<string, boolean>).filter(Boolean).length;

  useEffect(() => {
    const count = visibleParticipants.length;
    if (previousParticipantCountRef.current === 0) { previousParticipantCountRef.current = count; return; }
    if (count > previousParticipantCountRef.current) {
      playAlertTone([{ frequency: 185, duration: 0.18 }, { frequency: 247, duration: 0.22, delay: 0.14 }]);
    } else if (count < previousParticipantCountRef.current) {
      playAlertTone([{ frequency: 247, duration: 0.16 }, { frequency: 196, duration: 0.18, delay: 0.1 }]);
    }
    previousParticipantCountRef.current = count;
  }, [visibleParticipants.length]);

  useEffect(() => {
    if (!isHost) return;
    if (previousRaisedHandCountRef.current === 0) { previousRaisedHandCountRef.current = raisedHandCount; return; }
    if (raisedHandCount > previousRaisedHandCountRef.current) {
      playAlertTone([{ frequency: 523, duration: 0.12 }, { frequency: 659, duration: 0.14, delay: 0.12 }, { frequency: 784, duration: 0.18, delay: 0.24 }]);
    }
    previousRaisedHandCountRef.current = raisedHandCount;
  }, [isHost, raisedHandCount]);

  const drawerTitle: Record<string, string> = {
    audio: "Audio",
    participants: "Participants",
    board: "Board Control",
    agenda: "Agenda & Notes",
    files: "Shared Files",
  };

  return (
    <>
      {/* ── Right-side drawer — pushes board, doesn't cover toolbar ── */}
      {/* Backdrop (mobile only) */}
      {activeDrawer && (
        <div
          onClick={closeDrawer}
          className={`fixed inset-0 z-40 bg-black/40 sm:hidden transition-opacity duration-280 ${drawerVisible ? "opacity-100" : "opacity-0"}`}
        />
      )}

      {/* Drawer panel */}
      <div
        style={{ width: DRAWER_WIDTH }}
        className={`fixed top-0 right-0 h-full z-40 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl
          transition-transform duration-280 ease-out
          ${activeDrawer && drawerVisible ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Drawer header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <span className="text-sm font-semibold text-slate-200">
            {activeDrawer ? drawerTitle[activeDrawer] : ""}
          </span>
          <button
            onClick={closeDrawer}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Audio — always mounted so LiveKit stays connected */}
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

        {activeDrawer === "participants" && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {visibleParticipants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-8 w-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-500">No participants yet</p>
              </div>
            ) : visibleParticipants.map((u) => (
              <div key={u.id} className="flex items-center gap-2.5 bg-slate-800 border border-slate-700 px-3 py-2.5 rounded-xl">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {(u.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate font-medium">{u.name || "User"}</p>
                  <p className="text-[10px] text-slate-500">{u.id === currentUserId ? "You" : "Participant"}</p>
                </div>
                {isHost && u.id !== currentUserId && (
                  <div className="flex items-center gap-1 shrink-0">
                    {onViewBoard && (
                      <button onClick={() => { onViewBoard(u.id); closeDrawer(); }}
                        title="View their board"
                        className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
                        <LayoutPanelLeft className="h-3 w-3" />
                      </button>
                    )}
                    {onShareBoard && (
                      <button onClick={() => { onShareBoard(u.id); closeDrawer(); }}
                        title="Share their board to all"
                        className="p-1.5 rounded-lg bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900 transition-colors">
                        <Share2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeDrawer === "board" && isHost && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest px-1 mb-3">Grant / Revoke draw access</p>
            {visibleParticipants.filter((u) => u.id !== currentUserId).length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No participants to manage</p>
            ) : visibleParticipants.filter((u) => u.id !== currentUserId).map((u) => (
              <div key={u.id} className="flex items-center gap-2.5 bg-slate-800 border border-slate-700 px-3 py-2.5 rounded-xl">
                <div className="h-7 w-7 rounded-full bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-200 shrink-0">
                  {(u.name || "?").charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-slate-200 truncate flex-1">{u.name || "User"}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {onViewBoard && (
                    <button onClick={() => { onViewBoard(u.id); closeDrawer(); }}
                      title="View board" className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
                      <LayoutPanelLeft className="h-3 w-3" />
                    </button>
                  )}
                  {onShareBoard && (
                    <button onClick={() => { onShareBoard(u.id); closeDrawer(); }}
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
            ))}
          </div>
        )}

        {activeDrawer === "agenda" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <AgendaPanel isHost={isHost} />
          </div>
        )}

        {activeDrawer === "files" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <FilesPanel currentUserId={currentUserId} currentUserName={currentUserName} isHost={isHost} />
          </div>
        )}
      </div>

      {/* ── Bottom Toolbar — always visible, shifts left when drawer is open ── */}
      <div
        style={{ paddingRight: activeDrawer && drawerVisible ? DRAWER_WIDTH : 0 }}
        className="relative z-30 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 shadow-xl transition-[padding] duration-280 ease-out"
      >
        <ToolbarButton
          icon={<Mic className="h-4 w-4" />}
          label="Audio"
          active={activeDrawer === "audio"}
          badge={isHost ? raisedHandCount : undefined}
          onClick={() => openDrawer("audio")}
        />
        <ToolbarButton
          icon={<Users className="h-4 w-4" />}
          label="Participants"
          active={activeDrawer === "participants"}
          badge={visibleParticipants.length > 0 ? visibleParticipants.length : undefined}
          onClick={() => openDrawer("participants")}
        />
        {isHost && (
          <ToolbarButton
            icon={<Pencil className="h-4 w-4" />}
            label="Board Control"
            active={activeDrawer === "board" || showBoardControl}
            onClick={() => {
              openDrawer("board");
              if (activeDrawer !== "board") onBoardControlToggle?.();
            }}
          />
        )}
        {!isHost && (
          <ToolbarButton
            icon={<LayoutPanelLeft className="h-4 w-4" />}
            label="My Board"
            active={showBoardControl}
            onClick={() => onBoardControlToggle?.()}
          />
        )}
        <ToolbarButton
          icon={<ClipboardList className="h-4 w-4" />}
          label="Agenda & Notes"
          active={activeDrawer === "agenda"}
          onClick={() => openDrawer("agenda")}
        />
        <ToolbarButton
          icon={<FileUp className="h-4 w-4" />}
          label="Shared Files"
          active={activeDrawer === "files"}
          onClick={() => openDrawer("files")}
        />
      </div>
    </>
  );
}

function ToolbarButton({ icon, label, active, onClick, badge }: {
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
