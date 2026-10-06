"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface RoomDrawerProps {
  title: string;
  hostName: string | null;
  children: React.ReactNode;
}

export function RoomDrawer({ title, hostName, children }: RoomDrawerProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  function openDrawer() {
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }

  function closeDrawer() {
    setVisible(false);
    setTimeout(() => setOpen(false), 300);
  }

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Trigger */}
      <button
        onClick={openDrawer}
        className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-opacity text-sm"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>
        Open Session
      </button>

      {/* Full-screen drawer */}
      {open && (
        <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
          <div
            className={`absolute inset-0 flex flex-col bg-slate-950 text-white transition-transform duration-300 ease-out ${
              visible ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Header */}
            <header className="shrink-0 h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Live</span>
                </div>
                <div className="h-4 w-px bg-slate-700 shrink-0" />
                <div className="min-w-0">
                  <h2 className="font-bold text-sm text-white leading-tight truncate">{title}</h2>
                  {hostName && <p className="text-[11px] text-slate-400 truncate">Host: {hostName}</p>}
                </div>
              </div>

              <button
                onClick={closeDrawer}
                className="shrink-0 ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Close
              </button>
            </header>

            {/* Room content */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
