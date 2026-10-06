"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, GraduationCap, Target, FileText, Search, X, Check } from "lucide-react";

type Learner = { id: string; displayName: string; avatarUrl: string | null };

export function NewPlanForm({ expertId, learners }: { expertId: string; learners: Learner[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    goal: "",
    status: "draft" as "draft" | "active",
    completionMode: "fixed_curriculum" as "fixed_curriculum" | "ongoing_path",
    requiredLessonCount: "",
    endsAt: "",
  });

  const filtered = useMemo(() =>
    learners.filter((l) => l.displayName.toLowerCase().includes(search.toLowerCase())),
    [learners, search]
  );

  function toggleLearner(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0 || !form.title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // Create ONE shared plan with all selected learners
      const res = await fetch("/api/learning-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expertId,
          learnerIds: Array.from(selectedIds),
          title: form.title.trim(),
          description: form.description.trim() || null,
          goal: form.goal.trim() || null,
          status: form.status,
          completionMode: form.completionMode,
          requiredLessonCount: form.completionMode === "fixed_curriculum" && form.requiredLessonCount
            ? Number(form.requiredLessonCount)
            : null,
          endsAt: form.endsAt || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Failed to create plan");
      }
      const data = await res.json() as { plan: { id: string } };
      router.push(`/dashboard/learning/${data.plan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const selectedLearners = learners.filter((l) => selectedIds.has(l.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Learner selector */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <p className="text-sm font-bold text-slate-900">Select Learners <span className="text-rose-500">*</span></p>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedIds.size === 0
              ? "Select the learners who will share this plan"
              : `${selectedIds.size} learner${selectedIds.size > 1 ? "s" : ""} selected`}
          </p>
        </div>

        {/* Selected chips */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
            {selectedLearners.map((l) => (
              <span key={l.id} className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                {l.displayName}
                <button type="button" onClick={() => toggleLearner(l.id)} className="text-indigo-400 hover:text-indigo-700">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="p-4">
          {learners.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm font-semibold text-amber-900">No connected learners</p>
              <p className="mt-1 text-sm text-amber-700">Connect with learners first before creating a plan.</p>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${learners.length} learner${learners.length > 1 ? "s" : ""}…`}
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              {/* Select all / clear */}
              {learners.length > 1 && (
                <div className="mb-2 flex gap-3">
                  <button type="button" onClick={() => setSelectedIds(new Set(learners.map((l) => l.id)))} className="text-xs font-semibold text-indigo-600">
                    Select all ({learners.length})
                  </button>
                  {selectedIds.size > 0 && (
                    <button type="button" onClick={() => setSelectedIds(new Set())} className="text-xs font-semibold text-slate-500">
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Learner list — scrollable if many */}
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                {filtered.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">No learners match &quot;{search}&quot;</p>
                ) : (
                  filtered.map((l) => {
                    const selected = selectedIds.has(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => toggleLearner(l.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                          selected ? "border-indigo-200 bg-indigo-50" : "border-transparent hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-bold text-white">
                          {l.displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 text-sm font-medium text-slate-900">{l.displayName}</span>
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${selected ? "border-indigo-600 bg-indigo-600" : "border-slate-300"}`}>
                          {selected && <Check size={10} className="text-white" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Plan details */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50">
            <GraduationCap size={14} className="text-purple-600" />
          </div>
          <p className="text-sm font-bold text-slate-900">Plan Details</p>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Plan Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. React Fundamentals — 6 Week Plan"
              maxLength={160}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Target size={11} /> Learning Goal
            </label>
            <textarea
              value={form.goal}
              onChange={(e) => set("goal", e.target.value)}
              placeholder="What should the learner be able to do by the end?"
              rows={2}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <FileText size={11} /> Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Overview of what this plan covers…"
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Plan Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "fixed_curriculum" as const, label: "Fixed Plan" },
                  { value: "ongoing_path" as const, label: "Ongoing" },
                ].map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => set("completionMode", mode.value)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      form.completionMode === mode.value
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                End Date
              </label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => set("endsAt", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>
          </div>
          {form.completionMode === "fixed_curriculum" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Required Lessons to Finish
              </label>
              <input
                type="number"
                min={1}
                value={form.requiredLessonCount}
                onChange={(e) => set("requiredLessonCount", e.target.value)}
                placeholder="Leave empty to use the full curriculum"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
              />
              <p className="mt-1 text-xs text-slate-500">
                Learners complete the plan after this many lessons, or all lessons if left empty.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <p className="text-sm font-bold text-slate-900">Initial Status</p>
          <p className="text-xs text-slate-500 mt-0.5">You can change this later</p>
        </div>
        <div className="flex gap-3 p-5">
          {(["draft", "active"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set("status", s)}
              className={`flex-1 rounded-2xl border py-3 text-sm font-semibold capitalize transition ${
                form.status === s
                  ? "border-indigo-300 bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || selectedIds.size === 0 || !form.title.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <GraduationCap size={15} />}
        {selectedIds.size > 1 ? `Create Plan for ${selectedIds.size} Learners` : "Create Learning Plan"}
      </button>
    </form>
  );
}
