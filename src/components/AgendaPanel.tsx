"use client";

import { useMutation, useStorage } from "@liveblocks/react/suspense";
import { CheckSquare, Square, BookOpen } from "lucide-react";

const SKILL_LEVEL_LABELS: Record<string, string> = {
  general: "General",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const SKILL_LEVEL_COLORS: Record<string, string> = {
  general: "bg-slate-100 text-slate-600",
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced: "bg-red-100 text-red-700",
};

export function AgendaPanel({ isHost }: { isHost: boolean }) {
  const brief = useStorage((root) => (root as any).sessionBrief);

  const toggleItem = useMutation(({ storage }, item: string) => {
    const b = (storage as any).get("sessionBrief");
    const checked: string[] = b.get("checkedItems") ?? [];
    if (checked.includes(item)) {
      b.set("checkedItems", checked.filter((i: string) => i !== item));
    } else {
      b.set("checkedItems", [...checked, item]);
    }
  }, []);

  const updateNotes = useMutation(({ storage }, notes: string) => {
    (storage as any).get("sessionBrief")?.set("notes", notes);
  }, []);

  const agenda: string[] = brief?.agenda ?? [];
  const checkedItems: string[] = brief?.checkedItems ?? [];
  const notes: string = brief?.notes ?? "";
  const skillLevel: string = brief?.skillLevel ?? "general";

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-5">
      {/* Skill level badge */}
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SKILL_LEVEL_COLORS[skillLevel] ?? SKILL_LEVEL_COLORS.general}`}>
          {SKILL_LEVEL_LABELS[skillLevel] ?? skillLevel}
        </span>
      </div>

      {/* Agenda checklist */}
      {agenda.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Agenda</p>
          {agenda.map((item) => {
            const checked = checkedItems.includes(item);
            return (
              <button
                key={item}
                onClick={() => toggleItem(item)}
                className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  checked
                    ? "bg-indigo-900/40 text-indigo-300"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
              >
                {checked
                  ? <CheckSquare className="h-4 w-4 shrink-0 mt-0.5 text-indigo-400" />
                  : <Square className="h-4 w-4 shrink-0 mt-0.5 text-slate-500" />
                }
                <span className={`text-sm leading-snug ${checked ? "line-through opacity-60" : ""}`}>
                  {item}
                </span>
              </button>
            );
          })}
          <p className="text-[10px] text-slate-500 pt-1 text-right">
            {checkedItems.length}/{agenda.length} covered
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <BookOpen className="h-7 w-7 text-slate-600 mb-2" />
          <p className="text-xs text-slate-500">No agenda set for this session.</p>
          {isHost && (
            <p className="text-[10px] text-slate-600 mt-1">
              Add agenda items when starting a session next time.
            </p>
          )}
        </div>
      )}

      {/* Shared notes */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Session Notes {!isHost && <span className="normal-case font-normal">(read-only)</span>}
        </p>
        {isHost ? (
          <textarea
            value={notes}
            onChange={(e) => updateNotes(e.target.value)}
            placeholder="Add notes visible to all participants..."
            rows={5}
            className="w-full rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-600"
          />
        ) : (
          <div className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 min-h-[80px]">
            {notes ? (
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{notes}</p>
            ) : (
              <p className="text-sm text-slate-600 italic">No notes yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
