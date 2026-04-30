"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function Lobby({ hostName }: { hostName: string | null }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-8 text-center">
      <div className="max-w-sm w-full">
        <div className="relative h-24 w-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
          <div className="relative h-24 w-24 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-amber-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Waiting to be admitted</h2>
        <p className="text-slate-400 text-sm mb-8">
          {hostName ? `${hostName} will let you in soon.` : "The host will let you in soon."}
        </p>

        <div className="flex items-center justify-center gap-2">
          <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
          <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
          <div className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" />
        </div>

        <p className="text-xs text-slate-600 mt-8">You'll be admitted automatically — no need to refresh.</p>
      </div>
    </div>
  );
}
