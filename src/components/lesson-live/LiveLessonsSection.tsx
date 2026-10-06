"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio, Clock, Users, Calendar } from "lucide-react";

type LiveLesson = {
  roomId: string;
  planId: string;
  planTitle: string;
  lessonTitle: string;
  hostName: string;
  startsAt: Date | null;
  status: "active" | "scheduled";
};

export function LiveLessonsSection({ userId, userRole }: { userId: string; userRole: string }) {
  const [lessons, setLessons] = useState<LiveLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/learning-plans/live-lessons?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setLessons(data.lessons ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  if (loading) return null;
  if (lessons.length === 0) return null;

  const activeLessons = lessons.filter((l) => l.status === "active");
  const upcomingLessons = lessons.filter((l) => l.status === "scheduled");

  return (
    <div className="space-y-4">
      {activeLessons.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold text-slate-900">
              {userRole === "expert" ? "Your Live Lessons" : "Live Lessons Now"}
            </h2>
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              {activeLessons.length} Live
            </span>
          </div>
          <div className="space-y-2">
            {activeLessons.map((lesson) => (
              <Link
                key={lesson.roomId}
                href={`/dashboard/room/${lesson.roomId}`}
                className="flex items-center justify-between bg-white rounded-xl border border-red-200 px-4 py-3 hover:border-red-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <Radio size={16} className="text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {lesson.planTitle}: {lesson.lessonTitle}
                    </p>
                    <p className="text-xs text-slate-500">Host: {lesson.hostName}</p>
                  </div>
                </div>
                <span className="shrink-0 ml-3 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
                  Join Now
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {upcomingLessons.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold text-slate-900">Upcoming Lessons</h2>
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold">
              <Calendar size={11} />
              {upcomingLessons.length}
            </span>
          </div>
          <div className="space-y-2">
            {upcomingLessons.map((lesson) => (
              <div
                key={lesson.roomId}
                className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {lesson.planTitle}: {lesson.lessonTitle}
                    </p>
                    <p className="text-xs text-slate-500">
                      {lesson.startsAt
                        ? new Date(lesson.startsAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "Time TBD"}{" "}
                      · {lesson.hostName}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
