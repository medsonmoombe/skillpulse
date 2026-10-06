"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Zap, CheckCircle2, Plus, ChevronRight, GraduationCap, Users, Radio } from "lucide-react";

type Plan = {
  id: string;
  title: string;
  description: string | null;
  goal: string | null;
  status: string;
  completionMode: string;
  requiredLessonCount: number | null;
  endsAt: string | Date | null;
  visibility: string;
  totalLessons: number;
  completedLessons: number;
  learnerId: string | null;
  expertId: string;
  topicName: string | null;
  memberCount: number;
  activeMemberCount: number;
  myMemberStatus: string | null;
};

const FILTER_OPTS = [
  { value: "all" as const, label: "All" },
  { value: "active" as const, label: "Active" },
  { value: "completed" as const, label: "Done" },
];

const STATUS_BADGE: Record<string, string> = {
  draft:     "border-0 bg-slate-100 text-slate-600 hover:bg-slate-100",
  active:    "border-0 bg-green-100 text-green-700 hover:bg-green-100",
  completed: "border-0 bg-indigo-100 text-indigo-700 hover:bg-indigo-100",
  archived:  "border-0 bg-amber-100 text-amber-700 hover:bg-amber-100",
};

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-fuchsia-500 to-violet-600",
];

export function LearningClient({ plans, userId, userRole }: {
  plans: Plan[]; userId: string; userRole: string;
}) {
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [liveLessonCount, setLiveLessonCount] = useState(0);

  // Expert sees plans they own; learner sees plans they're a member of
  const myPlans  = userRole === "expert"
    ? plans.filter((p) => p.expertId === userId)
    : plans.filter((p) => p.expertId !== userId || p.myMemberStatus !== null);

  const filtered = filter === "all" ? myPlans : myPlans.filter((p) => p.status === filter);

  const active    = myPlans.filter((p) => p.status === "active").length;
  const completed = myPlans.filter((p) => p.status === "completed").length;

  useEffect(() => {
    fetch(`/api/learning-plans/live-lessons?userId=${userId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { lessons: [] }))
      .then((data) => setLiveLessonCount(Array.isArray(data.lessons) ? data.lessons.length : 0))
      .catch(() => setLiveLessonCount(0));
  }, [userId]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            {userRole === "expert" ? "Learning Plans" : "My Learning"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {userRole === "expert"
              ? "Shared lesson plans you've created for your learners."
              : "Your personalised learning journeys with experts."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild className="gap-2 border-0 bg-red-600 text-white shadow-md shadow-red-500/20 hover:bg-red-700">
            <Link href="/dashboard/learning/live">
              <Radio size={14} />
              Live Lessons
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-[10px] font-bold text-white">
                {liveLessonCount}
              </span>
            </Link>
          </Button>
          {userRole === "expert" && (
            <Button asChild className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 shadow-md shadow-indigo-500/20 hover:opacity-90">
              <Link href="/dashboard/learning/new"><Plus size={15} /> New Plan</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Plans", value: myPlans.length, icon: GraduationCap, color: "text-indigo-600", bg: "bg-indigo-50",  sub: "all plans"   },
          { label: "Active",      value: active,         icon: Zap,           color: "text-green-600",  bg: "bg-green-50",   sub: "in progress" },
          { label: "Completed",   value: completed,      icon: CheckCircle2,  color: "text-purple-600", bg: "bg-purple-50",  sub: "finished"    },
        ].map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`h-10 w-10 rounded-2xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs font-medium text-slate-600 mt-0.5">{label}</p>
            <p className="text-[11px] text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Filter + list */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {userRole === "expert" ? "Plans I Created" : "My Learning Plans"} ({filtered.length})
          </p>
          <div className="flex gap-1">
            {FILTER_OPTS.map((o) => (
              <button
                key={o.value}
                onClick={() => setFilter(o.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  filter === o.value
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
              <BookOpen className="h-7 w-7 text-indigo-300" />
            </div>
            <p className="font-semibold text-slate-700">No plans here</p>
            <p className="mt-1 max-w-xs text-sm text-slate-400">
              {userRole === "expert" ? "Create your first learning plan." : "Ask your expert to create a plan for you."}
            </p>
            {userRole === "expert" && (
              <Button asChild className="mt-5 gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Link href="/dashboard/learning/new"><Plus size={14} /> Create Plan</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((plan, idx) => {
              const pct = plan.totalLessons > 0
                ? Math.round((plan.completedLessons / plan.totalLessons) * 100)
                : 0;
              const completionLabel = plan.completionMode === "ongoing_path"
                ? "Ongoing mentorship"
                : plan.endsAt
                  ? `Ends ${new Date(plan.endsAt).toLocaleDateString()}`
                : plan.requiredLessonCount
                  ? `Ends after ${plan.requiredLessonCount} lesson${plan.requiredLessonCount === 1 ? "" : "s"}`
                  : `Ends after ${plan.totalLessons} lesson${plan.totalLessons === 1 ? "" : "s"}`;
              const grad = GRADIENTS[idx % GRADIENTS.length];
              const badgeCls = STATUS_BADGE[plan.status] ?? STATUS_BADGE.draft;
              return (
                <Link
                  key={plan.id}
                  href={`/dashboard/learning/${plan.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-indigo-200 hover:shadow-sm"
                >
                  {/* Gradient avatar */}
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} text-base font-bold text-white shadow-sm`}>
                    {plan.title.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                        {plan.title}
                      </p>
                      <Badge className={`shrink-0 text-[10px] px-2 py-0 ${badgeCls}`}>
                        {plan.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-xs text-slate-500">
                        {plan.completedLessons}/{plan.totalLessons} lessons
                      </span>
                      <span className="text-xs text-slate-400">{completionLabel}</span>
                      {plan.topicName && (
                        <span className="text-xs text-slate-400">· {plan.topicName}</span>
                      )}
                      {/* Show member count for experts */}
                      {userRole === "expert" && plan.memberCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Users size={10} />
                          {plan.memberCount} learner{plan.memberCount > 1 ? "s" : ""}
                        </span>
                      )}
                      {/* Show member status for learners */}
                      {userRole === "learner" && plan.myMemberStatus && plan.myMemberStatus !== "active" && (
                        <Badge className="border-0 bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] px-2 py-0">
                          {plan.myMemberStatus}
                        </Badge>
                      )}
                    </div>
                    {plan.totalLessons > 0 && (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-indigo-600">{pct}%</p>
                    <ChevronRight size={15} className="ml-auto mt-1 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
