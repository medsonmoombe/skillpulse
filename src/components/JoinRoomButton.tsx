"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function JoinRoomButton({ roomId }: { roomId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = () => {
    setLoading(true);
    router.push(`/dashboard/room/${roomId}`);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors shrink-0 ml-3"
    >
      {loading && <Loader2 className="h-3 w-3 animate-spin" />}
      {loading ? "Joining..." : "Join Room"}
    </button>
  );
}
