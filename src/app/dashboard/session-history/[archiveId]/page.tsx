import { getCurrentUser } from "@/lib/currentUser";
import { redirect, notFound } from "next/navigation";
import { getSessionArchiveForUser } from "@/lib/session-archive";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Video, FileText, Link2, StickyNote,
  CheckSquare, Clock, User, BookOpen, Play, Layers,
} from "lucide-react";
import Link from "next/link";
import { UploadRecordingForm } from "./UploadRecordingForm";

const RESOURCE_ICONS: Record<string, React.ElementType> = {
  recording: Video, doc: FileText, link: Link2, note: StickyNote, file: FileText,
};

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ archiveId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { archiveId } = await params;
  const session = await getSessionArchiveForUser(archiveId, user.id);
  if (!session) notFound();

  const isHost = session.hostId === user.id;
  const summary = session.summary as { totalElements?: number; textSnippets?: string[]; shapeCount?: number } | null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/session-history"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={14} />
        Session History
      </Link>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400" />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{session.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {session.skillLevel && (
                  <Badge className="border-0 bg-indigo-100 text-indigo-700 hover:bg-indigo-100 capitalize">
                    {session.skillLevel}
                  </Badge>
                )}
                {session.recordingUrl && (
                  <Badge className="border-0 bg-purple-100 text-purple-700 hover:bg-purple-100 gap-1">
                    <Play size={10} /> Recording available
                  </Badge>
                )}
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock size={12} />
                  {new Date(session.endedAt).toLocaleDateString("en-GB", {
                    weekday: "short", day: "numeric", month: "long", year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <User size={12} />
                  {isHost ? "You hosted this session" : "You attended"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recording */}
      {session.recordingUrl ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100">
              <Play size={14} className="text-purple-600" />
            </div>
            <p className="text-sm font-bold text-slate-900">Session Recording</p>
          </div>
          <div className="p-5">
            <video
              src={session.recordingUrl}
              controls
              className="w-full rounded-2xl bg-slate-900 shadow-inner"
              style={{ maxHeight: 380 }}
            />
          </div>
        </div>
      ) : isHost ? (
        <div className="overflow-hidden rounded-3xl border-2 border-dashed border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
              <Video size={14} className="text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Upload Recording</p>
              <p className="text-xs text-slate-500">Share a link to your session recording</p>
            </div>
          </div>
          <div className="p-5">
            <UploadRecordingForm archiveId={session.id} />
          </div>
        </div>
      ) : null}

      {/* Agenda + Board summary side by side on large screens */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Agenda */}
        {session.agenda && session.agenda.length > 0 && (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50">
                <CheckSquare size={14} className="text-indigo-600" />
              </div>
              <p className="text-sm font-bold text-slate-900">Session Agenda</p>
              <Badge className="ml-auto border-0 bg-slate-100 text-slate-500 hover:bg-slate-100">
                {session.agenda.length}
              </Badge>
            </div>
            <ul className="divide-y divide-slate-50">
              {session.agenda.map((item, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white shadow-sm">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-700 leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Board summary */}
        {summary && (summary.totalElements ?? 0) > 0 && (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
                <Layers size={14} className="text-amber-600" />
              </div>
              <p className="text-sm font-bold text-slate-900">Board Summary</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Elements", value: summary.totalElements ?? 0 },
                  { label: "Shapes",   value: summary.shapeCount ?? 0 },
                  { label: "Text",     value: summary.textSnippets?.length ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-2xl bg-slate-50 p-3 text-center">
                    <p className="text-xl font-bold text-slate-900">{value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {summary.textSnippets && summary.textSnippets.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Text from board</p>
                  {summary.textSnippets.slice(0, 6).map((t, i) => (
                    <p key={i} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 leading-relaxed">
                      {t}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resources */}
      {session.resources && session.resources.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-50">
              <BookOpen size={14} className="text-green-600" />
            </div>
            <p className="text-sm font-bold text-slate-900">Resources</p>
            <Badge className="ml-auto border-0 bg-slate-100 text-slate-500 hover:bg-slate-100">
              {session.resources.length}
            </Badge>
          </div>
          <div className="divide-y divide-slate-50">
            {session.resources.map((r) => {
              const Icon = RESOURCE_ICONS[r.type] ?? FileText;
              return (
                <div key={r.id} className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <Icon size={14} className="text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{r.title}</p>
                    {r.description && <p className="truncate text-xs text-slate-500">{r.description}</p>}
                  </div>
                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                    >
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
  );
}
