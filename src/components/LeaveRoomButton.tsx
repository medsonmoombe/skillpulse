"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function LeaveRoomButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = () => {
    setLoading(true);
    router.push("/dashboard");
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-1.5 border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold rounded-lg transition-colors"
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {loading ? "Leaving..." : "Leave Room"}
    </button>
  );
}
