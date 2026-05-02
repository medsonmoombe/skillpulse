"use client";

import { type MouseEvent, useState } from "react";
import { useFormStatus } from "react-dom";
import { endLiveRoom } from "@/app/actions/room";
import { Loader2 } from "lucide-react";

type WindowWithBoardScene = Window & {
  __skillpulseGetMainBoardScene?: () => {
    elements: readonly any[];
    appState: any;
    files: any;
  } | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  const [preparing, setPreparing] = useState(false);

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form || pending || preparing) return;

    event.preventDefault();
    setPreparing(true);

    try {
      const getScene = (window as WindowWithBoardScene).__skillpulseGetMainBoardScene;
      const scene = getScene?.();

      if (scene && Array.isArray(scene.elements) && scene.elements.length > 0) {
        const { exportToBlob } = await import("@excalidraw/excalidraw");
        const blob = await exportToBlob({
          elements: scene.elements as any,
          appState: {
            ...scene.appState,
            exportBackground: true,
            viewBackgroundColor: scene.appState?.viewBackgroundColor ?? "#ffffff",
          },
          files: scene.files ?? null,
          mimeType: "image/png",
          exportPadding: 24,
        });

        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result ?? ""));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });

        let imageInput = form.querySelector<HTMLInputElement>('input[name="boardImageDataUrl"]');
        if (!imageInput) {
          imageInput = document.createElement("input");
          imageInput.type = "hidden";
          imageInput.name = "boardImageDataUrl";
          form.appendChild(imageInput);
        }
        imageInput.value = dataUrl;
      }
    } catch (error) {
      console.error("Failed to capture board snapshot before ending session:", error);
    } finally {
      setPreparing(false);
      form.requestSubmit();
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending || preparing}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
    >
      {(pending || preparing) && <Loader2 className="h-3 w-3 animate-spin" />}
      {preparing ? "Capturing..." : pending ? "Ending..." : "End Session"}
    </button>
  );
}

export function EndSessionInlineButton({ roomId }: { roomId: string }) {
  return (
    <form action={endLiveRoom}>
      <input type="hidden" name="roomId" value={roomId} />
      <SubmitButton />
    </form>
  );
}
