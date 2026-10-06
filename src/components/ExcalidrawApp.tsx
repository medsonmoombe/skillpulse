"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useStorage, useMutation } from "@liveblocks/react/suspense";

declare global {
  interface Window {
    __skillpulseGetMainBoardScene?: () => {
      elements: readonly any[];
      appState: any;
      files: any;
    } | null;
  }
}

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
  const files = useStorage((root) => (root as any).excalidrawFiles ?? {});
  const permissions = useStorage((root) => (root as any).permissions);

  const canEdit = isHost || permissions?.[currentUserId] === true;

  const updateScene = useMutation(({ storage }, payload: { elements: any[]; files: Record<string, any> }) => {
    (storage.get("excalidrawState") as any)?.set("elements", payload.elements);
    const filesObject = (storage as any).get("excalidrawFiles");
    if (!filesObject) return;

    const nextFiles = payload.files ?? {};
    const existingKeys = Object.keys(filesObject.toObject?.() ?? {});
    const nextKeys = new Set(Object.keys(nextFiles));

    for (const key of existingKeys) {
      if (!nextKeys.has(key)) {
        filesObject.delete?.(key);
      }
    }

    for (const [key, value] of Object.entries(nextFiles)) {
      filesObject.set(key, value);
    }
  }, []);

  useEffect(() => {
    if (!apiRef.current) return;
    const incoming = JSON.stringify({ elements, files });
    if (incoming === lastSentRef.current) return;
    lastSentRef.current = incoming;
    apiRef.current.updateScene({ elements: elements as any, files: files as any });
  }, [elements, files]);

  const onChange = useCallback(
    (updated: readonly any[], _appState: any, nextFiles: any) => {
      if (!canEdit) return;
      // Any board change = session is active
      (window as any).__skillpulseResetActivity?.();
      const payload = {
        elements: [...updated],
        files: nextFiles ?? {},
      };
      const serialized = JSON.stringify(payload);
      if (serialized === lastSentRef.current) return;
      lastSentRef.current = serialized;
      updateScene(payload);
    },
    [updateScene, canEdit]
  );

  useEffect(() => {
    window.__skillpulseGetMainBoardScene = () => ({
      elements: apiRef.current?.getSceneElements?.() ?? (elements as any[]) ?? [],
      appState: apiRef.current?.getAppState?.() ?? { viewBackgroundColor: "#ffffff" },
      files: apiRef.current?.getFiles?.() ?? null,
    });

    return () => {
      if (window.__skillpulseGetMainBoardScene) {
        delete window.__skillpulseGetMainBoardScene;
      }
    };
  }, [elements, files]);

  return (
    <div className="h-full w-full relative">
      <Excalidraw
        excalidrawAPI={(api) => { apiRef.current = api; }}
        initialData={{
          elements: elements as any,
          files: files as any,
          appState: {
            viewBackgroundColor: "#ffffff",
          },
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: { saveFileToDisk: true },
            toggleTheme: false,
          },
          tools: { image: true },
        }}
        validateEmbeddable={false}
        onChange={onChange}
        viewModeEnabled={!canEdit}
      />
      {/* {!canEdit && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-800/80 px-4 py-2 text-xs text-white z-10">
          View only — ask the host for draw access
        </div>
      )} */}
    </div>
  );
}
