"use client";

import { useStorage, useMutation, useOthers } from "@liveblocks/react/suspense";
import { Pencil, Eye, Monitor, Share2 } from "lucide-react";

interface ParticipantPanelProps {
  admittedUsers: { id: string; name: string | null }[];
  isHost: boolean;
  currentHostId: string;
  onViewBoard?: (userId: string) => void;
  onShareBoard?: (userId: string) => void;
}

export function ParticipantPanel({ admittedUsers, isHost, currentHostId, onViewBoard, onShareBoard }: ParticipantPanelProps) {
  const permissions = useStorage((root) => (root as any).permissions);
  const others = useOthers();

  const realtimeParticipants = others.map((other) => ({
    id: String(other.id),
    name: ((other.info as { name?: string } | undefined)?.name ?? "User") as string,
  }));

  const visibleParticipants = realtimeParticipants.length > 0 ? realtimeParticipants : admittedUsers.filter((u) => u.id !== currentHostId);

  const grantControl = useMutation(({ storage }, userId: string) => {
    (storage.get("permissions") as any)?.set(userId, true);
  }, []);

  const revokeControl = useMutation(({ storage }, userId: string) => {
    (storage.get("permissions") as any)?.delete(userId);
  }, []);

  return (
    <div className="w-56 shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 py-3 border-b border-slate-800">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Board Control</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {visibleParticipants.map((u) => {
          const hasControl = permissions?.[u.id] === true;

          return (
            <div
              key={u.id}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors ${
                hasControl
                  ? "bg-indigo-900/40 border-indigo-700/50"
                  : "bg-slate-800 border-slate-700"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-6 w-6 rounded-full bg-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-200 shrink-0">
                  {(u.name || "U").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-200 truncate">{u.name || "User"}</p>
                  <p className="text-[10px] text-slate-500">{hasControl ? "Drawing" : "Viewing"}</p>
                </div>
              </div>

              {isHost && (
                <div className="flex items-center gap-1 shrink-0">
                  {/* View their personal board */}
                  {onViewBoard && (
                    <button onClick={() => onViewBoard(u.id)} title="View board"
                      className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
                      <Monitor className="h-3 w-3" />
                    </button>
                  )}
                  {/* Share their board to everyone */}
                  {onShareBoard && (
                    <button onClick={() => onShareBoard(u.id)} title="Share board to all"
                      className="p-1.5 rounded-lg bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900 transition-colors">
                      <Share2 className="h-3 w-3" />
                    </button>
                  )}
                  {/* Grant/revoke draw access */}
                  {hasControl ? (
                    <button onClick={() => revokeControl(u.id)} title="Revoke draw access"
                      className="p-1.5 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-900 transition-colors">
                      <Eye className="h-3 w-3" />
                    </button>
                  ) : (
                    <button onClick={() => grantControl(u.id)} title="Give draw access"
                      className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
