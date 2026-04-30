"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useStorage, useMutation } from "@liveblocks/react/suspense";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-50 flex items-center justify-center text-slate-400">Loading Canvas...</div>,
  }
);

interface ExcalidrawAppProps {
  currentUserId: string;
  isHost: boolean;
}

export function ExcalidrawApp({ currentUserId, isHost }: ExcalidrawAppProps) {
  const apiRef = useRef<any>(null);
  const lastSentRef = useRef<string>("");

  const elements = useStorage((root) => (root.excalidrawState as any)?.elements ?? []);
  const permissions = useStorage((root) => (root as any).permissions);

  const canEdit = isHost || permissions?.get(currentUserId) === true;

  const updateElements = useMutation(({ storage }, updated: any[]) => {
    (storage.get("excalidrawState") as any)?.set("elements", updated);
  }, []);

  useEffect(() => {
    if (!apiRef.current) return;
    const incoming = JSON.stringify(elements);
    if (incoming === lastSentRef.current) return;
    apiRef.current.updateScene({ elements: elements as any });
  }, [elements]);

  const onChange = useCallback(
    (updated: readonly any[]) => {
      if (!canEdit) return;
      const serialized = JSON.stringify(updated);
      if (serialized === lastSentRef.current) return;
      lastSentRef.current = serialized;
      updateElements([...updated]);
    },
    [updateElements, canEdit]
  );

  return (
    <div className="h-full w-full relative">
      <Excalidraw
        excalidrawAPI={(api) => { apiRef.current = api; }}
        initialData={{
          elements: elements as any,
          appState: { viewBackgroundColor: "#ffffff" },
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: { saveFileToDisk: true },
          },
        }}
        validateEmbeddable={false}
        onChange={onChange}
        viewModeEnabled={!canEdit}
      />
      {!canEdit && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium shadow-md border border-amber-200 z-50 pointer-events-none">
          👁️ View Only — Ask host for control to draw
        </div>
      )}
    </div>
  );
}
