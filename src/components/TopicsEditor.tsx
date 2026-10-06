"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addUserTopic, removeUserTopic } from "@/app/actions/profile";
import { Plus, X, Loader2, Search, BookOpen, GraduationCap } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

type Topic = { id: string; name: string };
type UserTopic = { topicId: string; topicName: string; relationship: string };

interface TopicsEditorProps {
  role: "learner" | "expert";
  currentTopics: UserTopic[];
}

function TopicDropdown({
  available,
  relationship,
  onAdd,
  addingFor,
  isPending,
}: {
  available: Topic[];
  relationship: "interested" | "teaches";
  onAdd: (id: string, name: string, rel: "interested" | "teaches") => void;
  addingFor: string | null;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = available.filter((t) =>
    t.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Add topic
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topics…"
              className="flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-400">No topics found</li>
            ) : (
              filtered.map((t) => {
                const key = `${t.id}-${relationship}`;
                const loading = addingFor === key && isPending;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        onAdd(t.id, t.name, relationship);
                        setQuery("");
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 text-slate-400" />}
                      {t.name}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function TopicsEditor({ role, currentTopics }: TopicsEditorProps) {
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [topics, setTopics] = useState<UserTopic[]>(currentTopics);
  const [isPending, startTransition] = useTransition();
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetch("/api/topics").then((r) => r.json()).then(setAllTopics).catch(() => {});
  }, []);

  const interestedTopics = topics.filter((t) => t.relationship === "interested");
  const teachesTopics    = topics.filter((t) => t.relationship === "teaches");

  const handleAdd = (topicId: string, topicName: string, relationship: "interested" | "teaches") => {
    if (topics.some((t) => t.topicId === topicId && t.relationship === relationship)) return;
    const key = `${topicId}-${relationship}`;
    setAddingFor(key);
    const fd = new FormData();
    fd.append("topicId", topicId);
    fd.append("relationship", relationship);
    startTransition(async () => {
      try {
        const result = await addUserTopic(fd);
        if (!result.success) { showToast(result.message ?? "Could not add topic.", "error"); return; }
        setTopics((prev) => [...prev, { topicId, topicName, relationship }]);
      } catch { showToast("Could not add topic.", "error"); }
      finally { setAddingFor(null); }
    });
  };

  const handleRemove = (topicId: string, relationship: string) => {
    const key = `${topicId}-${relationship}`;
    setRemovingKey(key);
    const fd = new FormData();
    fd.append("topicId", topicId);
    fd.append("relationship", relationship);
    startTransition(async () => {
      try {
        const result = await removeUserTopic(fd);
        if (!result.success) { showToast(result.message ?? "Could not remove topic.", "error"); return; }
        setTopics((prev) => prev.filter((t) => !(t.topicId === topicId && t.relationship === relationship)));
      } catch { showToast("Could not remove topic.", "error"); }
      finally { setRemovingKey(null); }
    });
  };

  const available = (rel: "interested" | "teaches") =>
    allTopics.filter((t) => !topics.some((ut) => ut.topicId === t.id && ut.relationship === rel));

  const sections = [
    {
      label: "Learning",
      sublabel: "Topics you want to learn",
      relationship: "interested" as const,
      current: interestedTopics,
      chipColor: "bg-amber-50 text-amber-700 border border-amber-200",
      icon: BookOpen,
      iconColor: "text-amber-500 bg-amber-50",
    },
    {
      label: "Teaching",
      sublabel: "Topics you can help others with",
      relationship: "teaches" as const,
      current: teachesTopics,
      chipColor: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      icon: GraduationCap,
      iconColor: "text-emerald-500 bg-emerald-50",
    },
  ];

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">Topic Graph</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Powers matching, feed ranking, and discovery. Add what you learn and what you teach.
        </p>
      </div>

      <div className="divide-y divide-slate-50">
        {sections.map(({ label, sublabel, relationship, current, chipColor, icon: Icon, iconColor }) => (
          <div key={relationship} className="px-5 py-4">
            <div className="mb-3 flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconColor}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">{label}</p>
                <p className="text-[11px] text-slate-400">{sublabel}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {current.map((t) => {
                const key = `${t.topicId}-${t.relationship}`;
                return (
                  <span key={key} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${chipColor}`}>
                    {t.topicName}
                    <button
                      type="button"
                      onClick={() => handleRemove(t.topicId, t.relationship)}
                      disabled={removingKey === key}
                      className="opacity-60 transition hover:opacity-100"
                    >
                      {removingKey === key
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <X className="h-3 w-3" />
                      }
                    </button>
                  </span>
                );
              })}

              <TopicDropdown
                available={available(relationship)}
                relationship={relationship}
                onAdd={handleAdd}
                addingFor={addingFor}
                isPending={isPending}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
