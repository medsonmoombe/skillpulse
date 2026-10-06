"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useMutation, useStorage } from "@liveblocks/react/suspense";
import { LiveObject } from "@liveblocks/client";
import { Share2, X } from "lucide-react";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 text-sm text-slate-400">
        Loading board...
      </div>
    ),
  }
);

interface PersonalBoardProps {
  currentUserId: string;
  boardOwnerId: string;
  ownerName: string;
  isHost: boolean;
  onClose: () => void;
  onRequestShare?: (userId: string) => void;
}

export function PersonalBoard({
  currentUserId,
  boardOwnerId,
  ownerName,
  isHost,
  onClose,
  onRequestShare,
}: PersonalBoardProps) {
  const apiRef = useRef<any>(null);
  const lastSyncedRef = useRef<string>("");
  const isOwner = currentUserId === boardOwnerId;

  const elements = useStorage((root) => {
    const boards = (root as any).personalBoards;
    if (!boards) return [];

    const board = boards[boardOwnerId];
    if (!board) return [];

    return board.elements ?? [];
  });
  const files = useStorage((root) => {
    const boards = (root as any).personalBoards;
    if (!boards) return {};

    const board = boards[boardOwnerId];
    if (!board) return {};

    return board.files ?? {};
  });

  const ensureBoard = useMutation(({ storage }) => {
    const boards = (storage as any).get("personalBoards");
    if (!boards?.get(boardOwnerId)) {
      boards?.set(boardOwnerId, new LiveObject({ elements: [], files: {} }));
    }
  }, [boardOwnerId]);

  const updateBoard = useMutation(({ storage }, payload: { elements: any[]; files: Record<string, any> }) => {
    const boards = (storage as any).get("personalBoards");
    if (!boards) return;

    let board = boards.get(boardOwnerId);
    if (!board) {
      board = new LiveObject({ elements: payload.elements, files: payload.files });
      boards.set(boardOwnerId, board);
      return;
    }

    board.set("elements", payload.elements);
    board.set("files", payload.files);
  }, [boardOwnerId]);

  useEffect(() => {
    if (isOwner) {
      ensureBoard();
    }
  }, [ensureBoard, isOwner]);

  useEffect(() => {
    if (!apiRef.current) return;

    const nextSnapshot = JSON.stringify({ elements: elements ?? [], files: files ?? {} });
    if (nextSnapshot === lastSyncedRef.current) return;

    lastSyncedRef.current = nextSnapshot;
    apiRef.current.updateScene({ elements: (elements as any[]) ?? [] });
    if (files && Object.keys(files).length > 0) {
      apiRef.current.addFiles(Object.values(files));
    }
  }, [elements, files]);

  const handleChange = useCallback(
    (updated: readonly any[], _appState: any, nextFiles: any) => {
      if (!isOwner) return;

      const payload = {
        elements: [...updated],
        files: nextFiles ?? {},
      };
      const nextSnapshot = JSON.stringify(payload);
      if (nextSnapshot === lastSyncedRef.current) return;

      lastSyncedRef.current = nextSnapshot;
      updateBoard(payload);
    },
    [isOwner, updateBoard]
  );

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isOwner ? "bg-indigo-500" : "animate-pulse bg-emerald-500"}`} />
          <span className="text-xs font-semibold text-slate-700">
            {isOwner ? "My Board" : `${ownerName}'s Board`}
          </span>
          {!isOwner && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400">Live</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isHost && !isOwner && onRequestShare ? (
            <button
              onClick={() => onRequestShare(boardOwnerId)}
              title="Request to share this board with everyone"
              className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-600 transition-colors hover:bg-indigo-100"
            >
              <Share2 className="h-3 w-3" />
              Share to all
            </button>
          ) : null}

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        <Excalidraw
          excalidrawAPI={(api) => {
            apiRef.current = api;
            const initialElements = (elements as any[]) ?? [];
            const initialFiles = files as any;
            lastSyncedRef.current = JSON.stringify({ elements: initialElements, files: initialFiles ?? {} });
            api.updateScene({ elements: initialElements });
            if (initialFiles && Object.keys(initialFiles).length > 0) {
              api.addFiles(Object.values(initialFiles));
            }
            // Force viewers into selection mode so they can zoom/pan but not draw
            if (!isOwner) {
              api.setActiveTool({ type: "selection" });
            }
          }}
          initialData={{
            elements: (elements as any[]) ?? [],
            files: files as any,
            appState: { viewBackgroundColor: "#fafafa" },
          }}
          UIOptions={{
            canvasActions: { loadScene: false, export: false as any, toggleTheme: false },
            tools: { image: true },
          }}
          validateEmbeddable={false}
          onChange={handleChange}
          viewModeEnabled={false}
        />

        {/* {!isOwner ? (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-800/80 px-3 py-1.5 text-xs text-white">
            Viewing {ownerName}&apos;s board live
          </div>
        ) : null} */}
      </div>
    </div>
  );
}
