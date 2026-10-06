import { getCurrentUser } from "@/lib/currentUser";
import { redirect } from "next/navigation";
import { listSessionHistoryForUser } from "@/lib/session-archive";
import { Badge } from "@/components/ui/badge";
import { History, Video, BookOpen, Clock, ChevronRight, Play, FileText } from "lucide-react";
import Link from "next/link";

export default async function SessionHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const sessions = await listSessionHistoryForUser(user.id);
  const withRecordings = sessions.filter((s) => s.recordingUrl).length;
  const hosted = sessions.filter((s) => s.hostId === user.id).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Session History</h1>
        <p className="mt-1 text-sm text-slate-500">
          All past sessions — recordings, notes, and board summaries.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Sessions",  value: sessions.length,  icon: History,  color: "text-indigo-600", bg: "bg-indigo-50",  sub: "all time"          },
          { label: "With Recordings", value: withRecordings,   icon: Video,    color: "text-purple-600", bg: "bg-purple-50",  sub: "available to replay" },
          { label: "You Hosted",      value: hosted,           icon: BookOpen, color: "text-amber-600",  bg: "bg-amber-50",   sub: "as expert/host"    },
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

      {/* Session list */}
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
            <History className="h-8 w-8 text-indigo-300" />
          </div>
          <p className="font-semibold text-slate-700">No sessions yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Join or host a live session to see your history here.
          </p>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            All Sessions ({sessions.length})
          </p>
          <div className="space-y-2">
            {sessions.map((s) => {
              const isHost = s.hostId === user.id;
              return (
                <Link
                  key={s.id}
                  href={`/dashboard/session-history/${s.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-indigo-200 hover:shadow-sm"
                >
                  {/* Icon */}
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition ${s.recordingUrl ? "bg-purple-50 group-hover:bg-purple-100" : "bg-indigo-50 group-hover:bg-indigo-100"}`}>
                    {s.recordingUrl
                      ? <Play size={16} className="text-purple-600" />
                      : <FileText size={16} className="text-indigo-600" />
                    }
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                      {s.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {isHost ? "You hosted" : `by ${s.hostName}`}
                      </span>
                      {s.skillLevel && (
                        <Badge className="border-0 bg-slate-100 text-slate-600 text-[10px] hover:bg-slate-100 capitalize px-2 py-0">
                          {s.skillLevel}
                        </Badge>
                      )}
                      {s.recordingUrl && (
                        <Badge className="border-0 bg-purple-100 text-purple-700 text-[10px] hover:bg-purple-100 px-2 py-0">
                          Recording
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Date + arrow */}
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-slate-500">
                      {new Date(s.endedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(s.endedAt).getFullYear()}
                    </p>
                  </div>
                  <ChevronRight size={15} className="shrink-0 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
