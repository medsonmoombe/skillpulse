"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function JoinGroupButton({
  groupId,
  joinMode,
  disabled = false,
  label,
  className,
}: {
  groupId: string;
  joinMode: "open" | "approval_required";
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const defaultLabel = joinMode === "approval_required" ? "Request to Join" : "Join Group";

  async function handleJoin() {
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("groupId", groupId);
      await fetch("/api/groups/join", { method: "POST", body: fd });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleJoin}
      disabled={disabled || pending}
      className={className ?? "rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"}
    >
      {pending ? (
        <span className="flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          {joinMode === "approval_required" ? "Requesting…" : "Joining…"}
        </span>
      ) : (
        label ?? defaultLabel
      )}
    </button>
  );
}
