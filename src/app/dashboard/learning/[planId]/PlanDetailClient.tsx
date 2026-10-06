"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Pencil, FileText, Link2, Video, StickyNote, BookOpen,
  Target, Clock, CheckCircle2, Circle, ChevronDown, ChevronUp,
  Loader2, Calendar, Timer, TrendingUp, Flame, Users, UserCheck,
} from "lucide-react";
import { AddLessonForm } from "./AddLessonForm";
import { showToast, LPToast } from "@/components/lp-ui";
import { LessonLiveButton } from "@/components/lesson-live/LessonLiveButton";

type Lesson = {
  id: string; title: string; summary: string | null; objective: string | null;
  status: string; position: number; scheduledAt: Date | null; durationMinutes: number | null;
};
type Resource = { id: string; type: string; title: string; description: string | null; url: string | null };
type Member = {
  id: string; userId: string; status: string; role: string;
  displayName: string; email: string; avatarUrl: string | null;
  joinedAt: Date; completedAt: Date | null;
};
type ProgressRow = {
  id: string; planMemberId: string; lessonId: string;
  status: string; notes: string | null; completedAt: Date | null; updatedAt?: Date | null;
};
type MemberProgressSummary = {
  memberId: string; userId: string; completedLessons: number;
  totalTrackedLessons: number; progress: ProgressRow[];
};
type LessonProgressSummary = {
  lessonId: string;
  completedCount: number;
  inProgressCount: number;
  missedCount: number;
  notStartedCount: number;
  progress: Array<{
    memberId: string;
    userId: string;
    displayName: string;
    status: string;
    notes: string | null;
    completedAt: Date | null;
  }>;
};
type MyMembership = { id: string; userId: string; status: string } | null;
type Plan = {
  id: string; title: string; description: string | null; goal: string | null;
  status: string; completionMode: string; requiredLessonCount: number | null; endsAt: Date | null;
  totalLessons: number; completedLessons: number;
  learnerId: string | null; expertId: string;
  lessons: Lesson[]; resources: Resource[];
  members: Member[]; myMembership: MyMembership;
  memberProgressSummary: MemberProgressSummary[];
  lessonProgressSummary: LessonProgressSummary[];
};

const RESOURCE_ICONS: Record<string, React.ElementType> = {
  recording: Video, doc: FileText, link: Link2, note: StickyNote, file: FileText,
};
const STATUS_BADGE: Record<string, string> = {
  draft:     "border-0 bg-slate-100 text-slate-600 hover:bg-slate-100",
  active:    "border-0 bg-green-100 text-green-700 hover:bg-green-100",
  completed: "border-0 bg-indigo-100 text-indigo-700 hover:bg-indigo-100",
  archived:  "border-0 bg-amber-100 text-amber-700 hover:bg-amber-100",
};
const MEMBER_STATUS_BADGE: Record<string, string> = {
  invited:   "border-0 bg-amber-100 text-amber-700 hover:bg-amber-100",
  active:    "border-0 bg-green-100 text-green-700 hover:bg-green-100",
  completed: "border-0 bg-indigo-100 text-indigo-700 hover:bg-indigo-100",
  removed:   "border-0 bg-slate-100 text-slate-500 hover:bg-slate-100",
};
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getWeekDays(now: Date) {
  const today = startOfDay(now);
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  return DAYS.map((label, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + mondayOffset + index);
    return { label, date };
  });
}

function getActivityMetrics(progressRows: ProgressRow[], lessons: Lesson[]) {
  const lessonDurationById = new Map(lessons.map((lesson) => [lesson.id, lesson.durationMinutes ?? 0]));
  const now = new Date();
  const weekDays = getWeekDays(now);
  const dayBuckets = weekDays.map(({ label, date }) => ({
    label,
    date,
    count: 0,
    minutes: 0,
  }));

  for (const row of progressRows) {
    if (row.status === "not_started") continue;
    const timestamp = row.completedAt ?? row.updatedAt ?? null;
    if (!timestamp) continue;
    const eventDate = startOfDay(new Date(timestamp));
    const bucket = dayBuckets.find((day) => day.date.getTime() === eventDate.getTime());
    if (!bucket) continue;
    bucket.count += 1;
    if (row.status === "completed" || row.status === "in_progress") {
      bucket.minutes += lessonDurationById.get(row.lessonId) ?? 0;
    }
  }

  const maxCount = Math.max(...dayBuckets.map((day) => day.count), 0);
  const weeklyMinutes = dayBuckets.reduce((sum, day) => sum + day.minutes, 0);
  const previousWeekStart = new Date(weekDays[0].date);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const previousWeekEnd = new Date(weekDays[6].date);
  previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);

  let previousWeekMinutes = 0;
  for (const row of progressRows) {
    if (row.status !== "completed" && row.status !== "in_progress") continue;
    const timestamp = row.completedAt ?? row.updatedAt ?? null;
    if (!timestamp) continue;
    const eventDate = startOfDay(new Date(timestamp));
    if (eventDate >= previousWeekStart && eventDate <= previousWeekEnd) {
      previousWeekMinutes += lessonDurationById.get(row.lessonId) ?? 0;
    }
  }

  let streak = 0;
  const activeDays = new Set(
    progressRows
      .filter((row) => row.status !== "not_started")
      .map((row) => row.completedAt ?? row.updatedAt)
      .filter((value): value is Date => Boolean(value))
      .map((value) => startOfDay(new Date(value)).getTime())
  );

  for (let cursor = startOfDay(now); activeDays.has(cursor.getTime()); ) {
    streak += 1;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }

  const weeklyChangePct = previousWeekMinutes === 0
    ? weeklyMinutes > 0 ? 100 : 0
    : Math.round(((weeklyMinutes - previousWeekMinutes) / previousWeekMinutes) * 100);

  return {
    weekDays: dayBuckets.map((day) => ({
      label: day.label,
      count: day.count,
      heightPct: maxCount > 0 ? Math.max(14, Math.round((day.count / maxCount) * 100)) : 0,
    })),
    weeklyMinutes,
    weeklyChangePct,
    streak,
  };
}

function getCompletionRuleLabel(plan: Plan, lessonCount: number) {
  if (plan.completionMode === "ongoing_path") {
    return "Ongoing mentorship path";
  }

  if (plan.endsAt) {
    return `Ends ${new Date(plan.endsAt).toLocaleDateString()}`;
  }

  if (plan.requiredLessonCount) {
    return `Ends after ${plan.requiredLessonCount} lesson${plan.requiredLessonCount === 1 ? "" : "s"}`;
  }

  return `Ends after ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}`;
}

export function PlanDetailClient({ plan, userId, userRole }: {
  plan: Plan; userId: string; userRole: string;
}) {
  void userRole;
  const isExpert = plan.expertId === userId;
  const [lessons, setLessons] = useState<Lesson[]>(plan.lessons);
  const [planStatus, setPlanStatus] = useState(plan.status);

  // For learners: find their membership and compute their personal progress
  const myMembership = plan.myMembership;
  const myProgress = myMembership
    ? plan.memberProgressSummary.find((s) => s.memberId === myMembership.id)
    : null;
  const [lessonProgress, setLessonProgress] = useState<Record<string, ProgressRow>>(
    () =>
      Object.fromEntries(
        myProgress?.progress.map((progress) => [progress.lessonId, progress]) ?? []
      )
  );
  const lessonProgressById = lessonProgress;
  const lessonSummaryById = new Map(
    plan.lessonProgressSummary.map((summary) => [summary.lessonId, summary])
  );

  // Per-learner completed lesson IDs (for the current user)
  const myCompletedLessonIds = new Set(
    Object.values(lessonProgress).filter((p) => p.status === "completed").map((p) => p.lessonId)
  );

  const trackedMembers = plan.members.filter((member) => member.status !== "removed");
  const expertCompletedLessons = plan.lessonProgressSummary.filter((summary) => summary.completedCount > 0).length;
  const done = isExpert ? expertCompletedLessons : myCompletedLessonIds.size;
  const total = lessons.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const nextLesson = lessons.find((l) => !myCompletedLessonIds.has(l.id));
  const learnerProgressRows = Object.values(lessonProgress);
  const expertProgressRows = plan.memberProgressSummary.flatMap((summary) => summary.progress);
  const analytics = getActivityMetrics(isExpert ? expertProgressRows : learnerProgressRows, lessons);
  const studyHours = analytics.weeklyMinutes / 60;
  const changePrefix = analytics.weeklyChangePct > 0 ? "+" : "";
  const completionRuleLabel = getCompletionRuleLabel(plan, lessons.length);
  const requiredTarget = plan.completionMode === "fixed_curriculum"
    ? (plan.requiredLessonCount ?? lessons.length)
    : null;

  async function updatePlanStatus(nextStatus: "active" | "completed") {
    const previous = planStatus;
    setPlanStatus(nextStatus);
    const res = await fetch(`/api/learning-plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) {
      setPlanStatus(previous);
      const error = await res.json().catch(() => ({ error: "Failed to update learning plan" }));
      showToast(error.error || "Failed to update learning plan");
      return;
    }
    showToast(nextStatus === "completed" ? "Plan marked completed" : "Plan reopened");
  }

  async function toggleLesson(lesson: Lesson) {
    if (isExpert || !myMembership) return;
    const previous = lessonProgress[lesson.id];
    const isNowCompleted = previous?.status !== "completed";

    setLessonProgress((prev) => ({
      ...prev,
      [lesson.id]: {
        ...(prev[lesson.id] ?? {
          id: `optimistic-${lesson.id}`,
          planMemberId: myMembership.id,
          lessonId: lesson.id,
          completedAt: null,
        }),
        status: isNowCompleted ? "completed" : "not_started",
        notes: isNowCompleted ? "Learner manually marked lesson complete from learning plan." : null,
        completedAt: isNowCompleted ? new Date() : null,
      },
    }));

    const res = await fetch(`/api/learning-plans/${plan.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonId: lesson.id,
        planMemberId: myMembership.id,
        status: isNowCompleted ? "completed" : "not_started",
        notes: isNowCompleted ? "Learner manually marked lesson complete from learning plan." : null,
      }),
    });
    if (!res.ok) {
      setLessonProgress((prev) => {
        const next = { ...prev };
        if (previous) {
          next[lesson.id] = previous;
        } else {
          delete next[lesson.id];
        }
        return next;
      });
      const error = await res.json().catch(() => ({ error: "Failed to update progress" }));
      showToast(error.error || "Failed to update progress");
      return;
    }

    const data = await res.json() as { progress: ProgressRow };
    setLessonProgress((prev) => ({ ...prev, [lesson.id]: data.progress }));
    if (isNowCompleted) showToast(`Completed: ${lesson.title}`);
  }

  function handleLessonSaved(updated: Lesson) {
    setLessons((prev) => prev.map((l) => {
      if (l.id === updated.id) {
        // Ensure dates are properly converted
        return {
          ...updated,
          scheduledAt: updated.scheduledAt ? new Date(updated.scheduledAt) : null,
        };
      }
      return l;
    }));
  }

  const activeMemberCount = trackedMembers.length;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/learning" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft size={14} /> Learning Plans
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{plan.title}</h1>
            <Badge className={STATUS_BADGE[planStatus] ?? STATUS_BADGE.draft}>{planStatus}</Badge>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              {completionRuleLabel}
            </span>
            {activeMemberCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                <Users size={11} /> {activeMemberCount} learner{activeMemberCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {plan.goal && (
            <div className="mt-2 flex items-start gap-2">
              <Target size={13} className="mt-0.5 shrink-0 text-indigo-500" />
              <p className="text-sm text-slate-600">{plan.goal}</p>
            </div>
          )}
          {requiredTarget && (
            <p className="mt-2 text-xs text-slate-500">
              Learners complete this plan after {requiredTarget} completed lesson{requiredTarget === 1 ? "" : "s"}.
            </p>
          )}
          {plan.endsAt && (
            <p className="mt-1 text-xs text-slate-500">
              Target end date: {new Date(plan.endsAt).toLocaleString()}
            </p>
          )}
        </div>
        {isExpert && (
          <div className="flex items-center gap-2">
            {planStatus === "active" ? (
              <button
                onClick={() => updatePlanStatus("completed")}
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                Complete Plan
              </button>
            ) : planStatus === "completed" ? (
              <button
                onClick={() => updatePlanStatus("active")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Reopen Plan
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-600">
            {isExpert ? "Overall Progress" : "Your Progress"}
          </span>
          <span className="text-sm font-bold text-indigo-600">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          {isExpert ? `${done} of ${total} lessons have learner completions` : `${done} of ${total} lessons completed`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left */}
        <div className="lg:col-span-2 space-y-4">

          {/* Lessons */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
              <BookOpen size={15} className="text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Lessons</h2>
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{lessons.length}</span>
            </div>

            {lessons.length === 0 && !isExpert ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="h-8 w-8 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">No lessons yet. Your expert will add them soon.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {lessons.map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    planId={plan.id}
                    isExpert={isExpert}
                    planStatus={planStatus}
                    learnerProgressStatus={lessonProgressById[lesson.id]?.status ?? null}
                    learnerProgressNote={lessonProgressById[lesson.id]?.notes ?? null}
                    lessonSummary={lessonSummaryById.get(lesson.id) ?? null}
                    isCompleted={myCompletedLessonIds.has(lesson.id)}
                    onToggle={() => toggleLesson(lesson)}
                    onSaved={handleLessonSaved}
                  />
                ))}
              </div>
            )}

            {isExpert && !(planStatus === "completed" && plan.completionMode === "fixed_curriculum") && (
              <div className="border-t border-slate-100 p-4">
                <AddLessonForm planId={plan.id} onAdded={(l) => setLessons((prev) => [...prev, l])} />
              </div>
            )}
          </div>

          {/* Members — expert only */}
          {isExpert && plan.members.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
                <Users size={15} className="text-slate-400" />
                <h2 className="text-sm font-bold text-slate-900">Learners</h2>
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  {plan.members.filter((m) => m.status !== "removed").length}
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {plan.members.filter((m) => m.status !== "removed").map((member) => {
                  const summary = plan.memberProgressSummary.find((s) => s.memberId === member.id);
                  const memberPct = lessons.length > 0 && summary
                    ? Math.round((summary.completedLessons / lessons.length) * 100)
                    : 0;
                  return (
                    <div key={member.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-bold text-white">
                        {member.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{member.displayName}</p>
                          <Badge className={`text-[10px] px-2 py-0 ${MEMBER_STATUS_BADGE[member.status] ?? MEMBER_STATUS_BADGE.invited}`}>
                            {member.status}
                          </Badge>
                        </div>
                        {total > 0 && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${memberPct}%` }} />
                            </div>
                            <span className="text-[11px] text-slate-400 shrink-0">{memberPct}%</span>
                          </div>
                        )}
                      </div>
                      <UserCheck size={14} className="shrink-0 text-slate-300" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resources */}
          {plan.resources.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
                <FileText size={15} className="text-slate-400" />
                <h2 className="text-sm font-bold text-slate-900">Resources</h2>
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{plan.resources.length}</span>
              </div>
              <div className="divide-y divide-slate-50">
                {plan.resources.map((r) => {
                  const Icon = RESOURCE_ICONS[r.type] ?? FileText;
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                        <Icon size={14} className="text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{r.title}</p>
                        {r.description && <p className="truncate text-xs text-slate-500">{r.description}</p>}
                      </div>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700">
                          Open
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Up Next — learner only */}
          {!isExpert && nextLesson && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <h3 className="text-sm font-bold text-slate-900">Up Next</h3>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100">
                    <Video size={14} className="text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900">{nextLesson.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {nextLesson.durationMinutes ? `${nextLesson.durationMinutes} min · ` : ""}Lesson {nextLesson.position}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => showToast(`Resuming: ${nextLesson.title}`)}
                  className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Continue Learning →
                </button>
              </div>
            </div>
          )}

          {/* Weekly activity */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h3 className="text-sm font-bold text-slate-900">Weekly Activity</h3>
              <span className="text-[11px] text-slate-400">This week</span>
            </div>
            <div className="p-4">
              <div className="flex items-end justify-between gap-1.5" style={{ height: 64 }}>
                {analytics.weekDays.map((day, i) => (
                  <div key={i} className="flex-1 rounded-t-md bg-indigo-100 relative" style={{ height: "100%" }}>
                    <div className="absolute bottom-0 left-0 right-0 rounded-t-md bg-gradient-to-t from-indigo-600 to-indigo-400" style={{ height: `${day.heightPct}%` }} />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between">
                {analytics.weekDays.map((day, i) => <span key={i} className="flex-1 text-center text-[10px] text-slate-400">{day.label}</span>)}
              </div>
            </div>
          </div>

          {/* Streak */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3">
              <h3 className="text-sm font-bold text-slate-900">Streak</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                  <Flame size={16} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{analytics.streak} Day Streak</p>
                  <p className="text-xs text-slate-500">Keep the momentum going</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className={`flex-1 h-1.5 rounded-full ${i < Math.min(analytics.streak, 7) ? "bg-amber-400" : "bg-slate-100"}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Study time */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3">
              <h3 className="text-sm font-bold text-slate-900">Study Time</h3>
            </div>
            <div className="p-4">
              <div className="flex items-end gap-1.5 mb-1">
                <span className="text-3xl font-bold text-slate-900">{studyHours.toFixed(studyHours >= 1 ? 1 : 2)}</span>
                <span className="mb-1 text-xs text-slate-500">hrs this week</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp size={13} className={analytics.weeklyChangePct >= 0 ? "text-green-500" : "text-rose-500"} />
                <span className={`text-xs font-semibold ${analytics.weeklyChangePct >= 0 ? "text-green-600" : "text-rose-600"}`}>
                  {changePrefix}{analytics.weeklyChangePct}%
                </span>
                <span className="text-xs text-slate-400">vs last week</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LPToast />
    </div>
  );
}

// ─── Lesson row ───────────────────────────────────────────────────────────────

function LessonRow({ lesson, planId, isExpert, planStatus, learnerProgressStatus, learnerProgressNote, lessonSummary, isCompleted, onToggle, onSaved }: {
  lesson: Lesson; planId: string; isExpert: boolean; planStatus: string; isCompleted: boolean;
  learnerProgressStatus: string | null; learnerProgressNote: string | null;
  lessonSummary: LessonProgressSummary | null;
  onToggle: () => void; onSaved: (updated: Lesson) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasRecordedProgress = Boolean(
    lessonSummary &&
    (lessonSummary.completedCount > 0 || lessonSummary.inProgressCount > 0 || lessonSummary.missedCount > 0)
  );
  const isMissed =
    learnerProgressStatus === "missed" ||
    (learnerProgressStatus === "not_started" && learnerProgressNote?.includes("[legacy-missed-fallback]"));
  const isInProgress = learnerProgressStatus === "in_progress";


  // Convert UTC time from server to local time for datetime-local input
  let initialScheduledAt = "";
  if (lesson.scheduledAt) {
    const date = new Date(lesson.scheduledAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    initialScheduledAt = `${year}-${month}-${day}T${hours}:${minutes}`;
  }
  
  const [form, setForm] = useState({
    title: lesson.title, objective: lesson.objective ?? "",
    status: (lesson.status === "completed" ? "published" : lesson.status) as "planned" | "published",
    scheduledAt: initialScheduledAt,
    durationMinutes: lesson.durationMinutes?.toString() ?? "30",
  });

  // Update form when lesson changes (after save)
  useEffect(() => {
    // Convert UTC time from server to local time for datetime-local input
    let localScheduledAt = "";
    if (lesson.scheduledAt) {
      const date = new Date(lesson.scheduledAt);
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      localScheduledAt = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    setForm({
      title: lesson.title,
      objective: lesson.objective ?? "",
      status: (lesson.status === "completed" ? "published" : lesson.status) as "planned" | "published",
      scheduledAt: localScheduledAt,
      durationMinutes: lesson.durationMinutes?.toString() ?? "30",
    });
  }, [lesson]);

  async function save() {
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      objective: form.objective.trim() || null,
      status: form.status,
      durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : 30,
    };
    
    // Handle scheduledAt with proper timezone conversion
    if (form.scheduledAt) {
      // datetime-local gives us local time without timezone info
      // We need to convert it to ISO string with timezone
      const localDate = new Date(form.scheduledAt);
      payload.scheduledAt = localDate.toISOString();
    } else {
      payload.scheduledAt = null;
    }
    

    
    const res = await fetch(`/api/learning-plans/${planId}/lessons/${lesson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json() as { lesson: Lesson };

      setEditing(false);
      onSaved(data.lesson);
      showToast("Lesson updated");
    } else {
      const error = await res.json().catch(() => ({ error: "Failed to update" }));
      console.error('Update failed:', error);
      showToast(error.error || "Failed to update lesson");
    }
  }

  // Expert edit form — only for non-completed lessons
  if (editing && isExpert && planStatus !== "completed" && lesson.status !== "completed") {
    return (
      <div className="border-b border-slate-50 bg-indigo-50/50 px-5 py-4">
        <div className="space-y-3">
          <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title *"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          <input value={form.objective} onChange={(e) => setForm((p) => ({ ...p, objective: e.target.value }))} placeholder="Objective"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div className="relative w-20">
              <Timer size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="number" value={form.durationMinutes} onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))} placeholder="Mins"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" required min={1} max={1440} />
            </div>
          </div>
          <div className="flex gap-2">
            {(["planned", "published"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setForm((p) => ({ ...p, status: s }))}
                className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold capitalize transition ${form.status === s ? "border-indigo-300 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-600">Cancel</button>
            <button onClick={save} disabled={saving || !form.title.trim()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : null} Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-3 px-5 py-3.5">
        {/* Toggle — learner only, disabled for expert */}
        <button onClick={!isExpert ? onToggle : undefined} disabled={isExpert} className="shrink-0 disabled:cursor-default">
          {isCompleted
            ? <CheckCircle2 size={20} className="text-indigo-500" />
            : <Circle size={20} className="text-slate-300" />
          }
        </button>

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${isCompleted ? "text-slate-400 line-through" : "text-slate-900"}`}>
            {lesson.title}
          </p>
          {lesson.objective && <p className="mt-0.5 text-xs text-slate-500">{lesson.objective}</p>}
          {!isExpert && (isMissed || isInProgress) && (
            <p className={`mt-1 text-[11px] font-medium ${isMissed ? "text-rose-600" : "text-amber-600"}`}>
              {isMissed ? "Not attended" : "Partially attended"}
            </p>
          )}
          {!isExpert && learnerProgressNote && (
            <p className="mt-0.5 text-[11px] text-slate-400">{learnerProgressNote}</p>
          )}
          {isExpert && lessonSummary && hasRecordedProgress && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {lessonSummary.completedCount > 0 && (
                <Badge className="border-0 bg-indigo-100 px-2 py-0 text-[10px] text-indigo-700 hover:bg-indigo-100">
                  {lessonSummary.completedCount} completed
                </Badge>
              )}
              {lessonSummary.inProgressCount > 0 && (
                <Badge className="border-0 bg-amber-100 px-2 py-0 text-[10px] text-amber-700 hover:bg-amber-100">
                  {lessonSummary.inProgressCount} follow-up
                </Badge>
              )}
              {lessonSummary.missedCount > 0 && (
                <Badge className="border-0 bg-rose-100 px-2 py-0 text-[10px] text-rose-700 hover:bg-rose-100">
                  {lessonSummary.missedCount} missed
                </Badge>
              )}
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {lesson.scheduledAt && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock size={10} />
                {new Date(lesson.scheduledAt).toLocaleString("en-GB", { 
                  day: "numeric", 
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            )}
            {lesson.durationMinutes && <span className="text-[11px] text-slate-400">{lesson.durationMinutes}min</span>}
            {/* Expert sees lesson publish status */}
            {isExpert && lesson.status !== "planned" && (
              <Badge className="border-0 bg-slate-100 text-slate-500 hover:bg-slate-100 text-[10px] px-2 py-0 capitalize">{lesson.status}</Badge>
            )}
            {!isExpert && isMissed && (
              <Badge className="border-0 bg-rose-100 text-rose-700 hover:bg-rose-100 text-[10px] px-2 py-0">Missed</Badge>
            )}
            {!isExpert && isInProgress && (
              <Badge className="border-0 bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px] px-2 py-0">Needs follow-up</Badge>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isExpert && planStatus !== "completed" && lesson.status !== "completed" && lesson.scheduledAt && !hasRecordedProgress && (
            <LessonLiveButton
              planId={planId}
              lessonId={lesson.id}
              lessonTitle={lesson.title}
              scheduledAt={lesson.scheduledAt}
            />
          )}
          {!isExpert && isInProgress && !isCompleted && (
            <button
              onClick={onToggle}
              className="rounded-xl bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-amber-700"
            >
              Mark complete
            </button>
          )}
          {lesson.summary && (
            <button onClick={() => setExpanded((v) => !v)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {/* Edit — expert only, not for completed lessons */}
          {isExpert && planStatus !== "completed" && lesson.status !== "completed" && (
            <button onClick={() => setEditing(true)} className="rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition">
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>

      {expanded && lesson.summary && (
        <div className="border-t border-slate-50 bg-slate-50 px-5 py-3">
          <p className="text-sm text-slate-600 leading-relaxed">{lesson.summary}</p>
        </div>
      )}
    </div>
  );
}
