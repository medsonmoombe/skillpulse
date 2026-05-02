"use client";

import { useEffect, useState, useTransition } from "react";
import { addUserTopic, removeUserTopic } from "@/app/actions/profile";
import { Plus, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

type Topic = { id: string; name: string };
type UserTopic = { topicId: string; topicName: string; relationship: string };

interface TopicsEditorProps {
  role: "learner" | "expert";
  currentTopics: UserTopic[];
}

export function TopicsEditor({ role, currentTopics }: TopicsEditorProps) {
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [topics, setTopics] = useState<UserTopic[]>(currentTopics);
  const [isPending, startTransition] = useTransition();
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then(setAllTopics)
      .catch(() => showToast("Could not load topics right now.", "error"));
  }, []);

  const interestedTopics = topics.filter((t) => t.relationship === "interested");
  const teachesTopics = topics.filter((t) => t.relationship === "teaches");

  const handleAdd = (topicId: string, topicName: string, relationship: "interested" | "teaches") => {
    if (topics.some((t) => t.topicId === topicId && t.relationship === relationship)) return;
    setAddingFor(`${topicId}-${relationship}`);
    const fd = new FormData();
    fd.append("topicId", topicId);
    fd.append("relationship", relationship);
    startTransition(async () => {
      try {
        const result = await addUserTopic(fd);
        if (!result.success) {
          showToast(result.message ?? "Could not add topic.", "error");
          return;
        }
        setTopics((prev) => [...prev, { topicId, topicName, relationship }]);
        showToast(result.message ?? "Topic added.", "success");
      } catch (error) {
        console.error("[TopicsEditor] add error:", error);
        showToast("Could not add topic. Please try again.", "error");
      } finally {
        setAddingFor(null);
      }
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
        if (!result.success) {
          showToast(result.message ?? "Could not remove topic.", "error");
          return;
        }
        setTopics((prev) => prev.filter((t) => !(t.topicId === topicId && t.relationship === relationship)));
        showToast(result.message ?? "Topic removed.", "success");
      } catch (error) {
        console.error("[TopicsEditor] remove error:", error);
        showToast("Could not remove topic. Please try again.", "error");
      } finally {
        setRemovingKey(null);
      }
    });
  };

  const availableToAdd = (relationship: "interested" | "teaches") =>
    allTopics.filter((t) => !topics.some((ut) => ut.topicId === t.id && ut.relationship === relationship));

  const Section = ({
    label,
    relationship,
    current,
    color,
  }: {
    label: string;
    relationship: "interested" | "teaches";
    current: UserTopic[];
    color: string;
  }) => (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-800">{label}</p>

      {/* Current topics */}
      <div className="flex flex-wrap gap-2">
        {current.map((t) => {
          const key = `${t.topicId}-${t.relationship}`;
          return (
            <span key={key} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${color}`}>
              {t.topicName}
              <button
                type="button"
                onClick={() => handleRemove(t.topicId, t.relationship)}
                disabled={removingKey === key}
                className="hover:opacity-70 transition-opacity"
              >
                {removingKey === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              </button>
            </span>
          );
        })}
        {current.length === 0 && <p className="text-xs text-slate-400 italic">None added yet</p>}
      </div>

      {/* Add topics */}
      <div className="flex flex-wrap gap-1.5">
        {availableToAdd(relationship).map((t) => {
          const key = `${t.id}-${relationship}`;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleAdd(t.id, t.name, relationship)}
              disabled={addingFor === key || isPending}
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50 transition-colors"
            >
              {addingFor === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              {t.name}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-bold text-slate-900">Topic Graph</p>
        <p className="mt-1 text-xs text-slate-500">
          These topics power matching, feed personalization, and discovery. Add topics you're learning or teaching.
        </p>
      </div>

      <Section
        label="Interested in (learning)"
        relationship="interested"
        current={interestedTopics}
        color="bg-amber-50 text-amber-700"
      />

      {/* Teaches section — available to both roles so learners can signal expertise too */}
      <Section
        label="Teaches / Can help with"
        relationship="teaches"
        current={teachesTopics}
        color="bg-emerald-50 text-emerald-700"
      />
    </div>
  );
}
