"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio, Clock, Calendar, ArrowLeft, Users, Video, AlertCircle } from "lucide-react";

type LiveLesson = {
  roomId: string;
  planId: string;
  planTitle: string;
  lessonTitle: string;
  hostName: string;
  startsAt: Date | null;
  status: "active" | "scheduled";
};

export function LiveLessonsClient({ userId, userRole }: { userId: string; userRole: string }) {
  const [lessons, setLessons] = useState<LiveLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/learning-plans/live-lessons?userId=${userId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch live lessons");
        return r.json();
      })
      .then((data) => {
        setLessons(data.lessons ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [userId]);

  const activeLessons = lessons.filter((l) => l.status === "active");
  const upcomingLessons = lessons.filter((l) => l.status === "scheduled");

  if (loading) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/learning" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft size={14} /> Learning Plans
        </Link>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/learning" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft size={14} /> Learning Plans
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {userRole === "expert" ? "Your Live Lessons" : "Live Lessons"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {userRole === "expert"
            ? "Track and manage your scheduled lesson sessions"
            : "Join live lessons and track your upcoming sessions"}
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Failed to load lessons</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Active Lessons */}
      {activeLessons.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <Radio size={15} className="text-red-500" />
            <h2 className="text-sm font-bold text-slate-900">Live Now</h2>
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              {activeLessons.length} Active
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {activeLessons.map((lesson) => (
              <Link
                key={lesson.roomId}
                href={`/dashboard/room/${lesson.roomId}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-red-50/50 transition-colors group"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 group-hover:bg-red-200 transition-colors">
                  <Video size={20} className="text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {lesson.planTitle}: {lesson.lessonTitle}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Host: {lesson.hostName}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                      <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse" />
                      LIVE
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  <span className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white group-hover:bg-red-700 transition-colors">
                    Join Now
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Lessons */}
      {upcomingLessons.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <Calendar size={15} className="text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900">Upcoming</h2>
            <span className="ml-auto rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-600">
              {upcomingLessons.length} Scheduled
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {upcomingLessons.map((lesson) => {
              const scheduledDate = lesson.startsAt ? new Date(lesson.startsAt) : null;
              const now = new Date();
              const diffMinutes = scheduledDate ? (scheduledDate.getTime() - now.getTime()) / 60000 : 0;
              const isWithin24Hours = diffMinutes > 0 && diffMinutes < 1440;
              
              return (
                <div
                  key={lesson.roomId}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isWithin24Hours ? 'bg-amber-100' : 'bg-indigo-100'}`}>
                    <Clock size={20} className={isWithin24Hours ? 'text-amber-600' : 'text-indigo-600'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {lesson.planTitle}: {lesson.lessonTitle}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Host: {lesson.hostName}
                    </p>
                    {scheduledDate && (
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] text-slate-600">
                          <Calendar size={10} />
                          {scheduledDate.toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-600">
                          <Clock size={10} />
                          {scheduledDate.toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {isWithin24Hours && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            Soon
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/learning/${lesson.planId}`}
                    className="shrink-0 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  >
                    View Plan
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeLessons.length === 0 && upcomingLessons.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <Video className="h-7 w-7 text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700">No live lessons scheduled</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            {userRole === "expert"
              ? "Schedule lessons in your learning plans to see them here."
              : "Your expert will schedule live lessons for you."}
          </p>
          <Link
            href="/dashboard/learning"
            className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            View Learning Plans
          </Link>
        </div>
      )}
    </div>
  );
}
