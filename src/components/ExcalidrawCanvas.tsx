"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useStorage } from "@liveblocks/react/suspense";
import { LayoutPanelLeft, X } from "lucide-react";
import { ExcalidrawApp } from "./ExcalidrawApp";
import { ParticipantPanel } from "./ParticipantPanel";
import { PersonalBoard } from "./PersonalBoard";

interface ExcalidrawCanvasProps {
  roomId: string;
  currentUserId: string;
  currentUserName: string;
  isHost: boolean;
  admittedUsers: { id: string; name: string | null }[];
  showBoardControl?: boolean;
  onRegisterCallbacks?: (cbs: {
    onViewBoard: (userId: string) => void;
    onShareBoard: (userId: string) => void;
    onRequestShare: (userId: string) => void;
  }) => void;
}

// Snap points: [label, mainPercent]
const SNAPS: [string, number][] = [
  ["Main full", 100],
  ["65 / 35",    65],
  ["Equal",      50],
  ["35 / 65",    35],
  ["Board full",  0],
];

export function ExcalidrawCanvas(props: ExcalidrawCanvasProps) {
  return <BoardLayout {...props} />;
}

function BoardLayout({
  currentUserId,
  currentUserName,
  isHost,
  admittedUsers,
  showBoardControl,
  onRegisterCallbacks,
}: Omit<ExcalidrawCanvasProps, "roomId">) {
  const [showPersonalBoard, setShowPersonalBoard] = useState(false);
  // splitPercent = width % given to the MAIN board (0 = personal full, 100 = main full)
  const [splitPercent, setSplitPercent] = useState(50);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const previousSharedBoardUserIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // ── Liveblocks storage ──────────────────────────────────────────────────────
  const sharedBoardUserId = useStorage((root) => (root as any).sharedBoard?.userId ?? null);
  const shareRequest = useStorage((root) => {
    const request = (root as any).shareRequest;
    if (!request) return null;
    const targetUserId = request.targetUserId;
    if (!targetUserId) return null;
    return {
      targetUserId: targetUserId as string,
      requestedById: (request.requestedById as string | null) ?? null,
      requestedByName: (request.requestedByName as string | null) ?? null,
    };
  });

  const activeRequestForCurrentUser = shareRequest?.targetUserId === currentUserId ? shareRequest : null;

  const setSharedBoardUserId = useMutation(({ storage }, userId: string | null) => {
    (storage as any).get("sharedBoard")?.set("userId", userId);
  }, []);

  const ensureHostPermission = useMutation(({ storage }) => {
    const permissions = (storage as any).get("permissions");
    if (!permissions) return;
    if (permissions.get(currentUserId) !== true) permissions.set(currentUserId, true);
  }, [currentUserId]);

  const setShareRequestMutation = useMutation(
    ({ storage }, req: { targetUserId: string | null; requestedById: string | null; requestedByName: string | null }) => {
      const s = (storage as any).get("shareRequest");
      s?.set("targetUserId", req.targetUserId);
      s?.set("requestedById", req.requestedById);
      s?.set("requestedByName", req.requestedByName);
    }, []
  );

  const clearShareRequest = useCallback(() => {
    setShareRequestMutation({ targetUserId: null, requestedById: null, requestedByName: null });
  }, [setShareRequestMutation]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openPersonalBoard = useCallback((userId: string) => {
    setViewingUserId(userId);
    setShowPersonalBoard(true);
    setSplitPercent((p) => (p === 100 ? 50 : p)); // don't stay at "main full"
  }, []);

  const handleViewBoard = useCallback((userId: string) => openPersonalBoard(userId), [openPersonalBoard]);

  const handleShareToAll = useCallback((userId: string) => {
    clearShareRequest();
    setSharedBoardUserId(userId);
    openPersonalBoard(userId);
  }, [clearShareRequest, setSharedBoardUserId, openPersonalBoard]);

  const handleRequestShare = useCallback((userId: string) => {
    setShareRequestMutation({ targetUserId: userId, requestedById: currentUserId, requestedByName: currentUserName });
  }, [currentUserId, currentUserName, setShareRequestMutation]);

  const handleStopShare = useCallback(() => {
    setSharedBoardUserId(null);
    setViewingUserId(null);
    setShowPersonalBoard(false);
    setSplitPercent(50);
  }, [setSharedBoardUserId]);

  const closePersonalBoard = useCallback(() => {
    setShowPersonalBoard(false);
    setViewingUserId(null);
    setSplitPercent(50);
  }, []);

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => { if (isHost) ensureHostPermission(); }, [ensureHostPermission, isHost]);

  useEffect(() => {
    onRegisterCallbacks?.({ onViewBoard: handleViewBoard, onShareBoard: handleShareToAll, onRequestShare: handleRequestShare });
  }, [onRegisterCallbacks, handleViewBoard, handleShareToAll, handleRequestShare]);

  useEffect(() => {
    if (sharedBoardUserId) {
      openPersonalBoard(sharedBoardUserId);
    } else if (previousSharedBoardUserIdRef.current) {
      setViewingUserId(null);
      setShowPersonalBoard(false);
      setSplitPercent(50);
    }
    previousSharedBoardUserIdRef.current = sharedBoardUserId;
  }, [sharedBoardUserId, openPersonalBoard]);

  useEffect(() => {
    if (activeRequestForCurrentUser) openPersonalBoard(currentUserId);
  }, [activeRequestForCurrentUser, currentUserId, openPersonalBoard]);

  // ── Drag-to-resize divider ───────────────────────────────────────────────────
  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const raw = ((ev.clientX - rect.left) / rect.width) * 100;
      // Clamp: min 15% main, max 85% main (so neither side disappears completely via drag)
      setSplitPercent(Math.min(85, Math.max(15, raw)));
    };

    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  // Touch support
  const onDividerTouchStart = useCallback((e: React.TouchEvent) => {
    const onMove = (ev: TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const raw = ((ev.touches[0].clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(85, Math.max(15, raw)));
    };
    const onEnd = () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const activeSharedBoardUserId = sharedBoardUserId ?? viewingUserId;
  const activeBoardOwnerId = activeSharedBoardUserId ?? currentUserId;
  const activeBoardOwnerName =
    activeBoardOwnerId === currentUserId
      ? currentUserName
      : admittedUsers.find((u) => u.id === activeBoardOwnerId)?.name ?? "User";

  const mainHidden   = showPersonalBoard && splitPercent === 0;
  const boardHidden  = showPersonalBoard && splitPercent === 100;

  return (
    <div ref={containerRef} className="relative flex h-full w-full select-none">

      {/* ── Main board ── */}
      <div
        style={{ width: showPersonalBoard ? `${splitPercent}%` : "100%" }}
        className="relative transition-[width] duration-150 min-w-0"
      >
        {/* Hide contents (not the div) when at 0% so Excalidraw doesn't unmount */}
        <div className={`h-full w-full ${mainHidden ? "invisible pointer-events-none" : ""}`}>
          <ExcalidrawApp currentUserId={currentUserId} isHost={isHost} />
        </div>

        {/* Share request banner */}
        {activeRequestForCurrentUser && (
          <div className="absolute left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-indigo-400/30 bg-indigo-600 px-4 py-3 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Board share request</p>
                <p className="mt-1 text-xs text-indigo-100">
                  {activeRequestForCurrentUser.requestedByName ?? "The host"} wants you to share your board with everyone.
                </p>
              </div>
              <button onClick={clearShareRequest} className="rounded-lg p-1 text-indigo-100 hover:bg-indigo-500 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button onClick={clearShareRequest} className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-800 transition-colors">
                Decline
              </button>
              <button onClick={() => handleShareToAll(currentUserId)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors">
                Share my board
              </button>
            </div>
          </div>
        )}

        {/* My Board toggle button */}
        <div className="absolute bottom-4 right-3 z-40 flex flex-col gap-2">
          <button
            onClick={() => {
              if (showPersonalBoard) {
                closePersonalBoard();
              } else {
                setShowPersonalBoard(true);
                setViewingUserId(null);
                setSplitPercent(50);
              }
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold shadow-lg transition-colors ${
              showPersonalBoard && !viewingUserId
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            <LayoutPanelLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{showPersonalBoard && !viewingUserId ? "Hide My Board" : "My Board"}</span>
          </button>

          {isHost && sharedBoardUserId && (
            <button onClick={handleStopShare} className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-lg hover:bg-red-700 transition-colors">
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Stop Share</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Draggable divider + snap buttons ── */}
      {showPersonalBoard && (
        <div
          onMouseDown={onDividerMouseDown}
          onTouchStart={onDividerTouchStart}
          className="relative z-20 flex w-2 shrink-0 cursor-col-resize flex-col items-center bg-slate-200 hover:bg-indigo-400 active:bg-indigo-500 transition-colors group"
        >
          {/* Drag handle grip */}
          <div className="mt-auto mb-auto flex flex-col gap-0.5 py-2">
            {[0,1,2,3,4].map((i) => (
              <div key={i} className="h-1 w-1 rounded-full bg-slate-400 group-hover:bg-white transition-colors" />
            ))}
          </div>

          {/* Snap preset buttons — appear on hover */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden group-hover:flex flex-col gap-1 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-30 min-w-[88px]">
            {SNAPS.map(([label, pct]) => (
              <button
                key={label}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setSplitPercent(pct)}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors ${
                  splitPercent === pct
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Personal / shared board ── */}
      {showPersonalBoard && (
        <div
          style={{ width: `${100 - splitPercent}%` }}
          className="relative transition-[width] duration-150 flex flex-col border-slate-200 bg-white min-w-0"
        >
          <div className={`h-full w-full ${boardHidden ? "invisible pointer-events-none" : ""}`}>
            <PersonalBoard
              currentUserId={currentUserId}
              boardOwnerId={activeBoardOwnerId}
              ownerName={activeBoardOwnerName}
              isHost={isHost}
              onClose={closePersonalBoard}
              onRequestShare={isHost ? handleRequestShare : undefined}
            />
          </div>
        </div>
      )}

      {/* ── Board control panel (host only) ── */}
      {isHost && showBoardControl && admittedUsers.length > 0 && (
        <div className="absolute right-0 top-0 z-30 h-full w-56 border-l border-slate-800 bg-slate-900 sm:w-64">
          <ParticipantPanel
            admittedUsers={admittedUsers}
            isHost={isHost}
            currentHostId={currentUserId}
            onViewBoard={handleViewBoard}
            onShareBoard={handleShareToAll}
          />
        </div>
      )}
    </div>
  );
}
