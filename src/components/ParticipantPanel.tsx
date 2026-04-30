"use client";

import { useStorage, useMutation } from "@liveblocks/react/suspense";
import { Pencil, Eye } from "lucide-react";

interface ParticipantPanelProps {
  admittedUsers: { id: string; name: string | null }[];
  isHost: boolean;
  currentHostId: string;
}

export function ParticipantPanel({ admittedUsers, isHost, currentHostId }: ParticipantPanelProps) {
  const permissions = useStorage((root) => (root as any).permissions);

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
        {admittedUsers.map((u) => {
          const hasControl = permissions?.get(u.id) === true;
          const isSelf = u.id === currentHostId;

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
                  <p className="text-xs text-slate-200 truncate">{u.name || "User"}{isSelf ? " (You)" : ""}</p>
                  <p className="text-[10px] text-slate-500">{hasControl ? "Drawing" : "Viewing"}</p>
                </div>
              </div>

              {isHost && !isSelf && (
                hasControl ? (
                  <button
                    onClick={() => revokeControl(u.id)}
                    title="Revoke control"
                    className="shrink-0 p-1.5 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-900 transition-colors"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    onClick={() => grantControl(u.id)}
                    title="Give control"
                    className="shrink-0 p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
