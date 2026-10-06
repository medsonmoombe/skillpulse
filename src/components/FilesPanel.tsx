"use client";

import { LiveList } from "@liveblocks/client";
import { useMutation, useStorage } from "@liveblocks/react/suspense";
import { useRef, useState } from "react";
import {
  FileText, Image as ImageIcon, Lock, Unlock,
  Upload, X, Download, Loader2, Eye,
} from "lucide-react";

type SessionFile = {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedByName: string;
  allowDownload: boolean;
  uploadedAt: string;
};

const ACCEPTED = [
  "image/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
].join(",");

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-indigo-400" />;
  return <FileText className="h-4 w-4 text-amber-400" />;
}

export function FilesPanel({
  currentUserId,
  currentUserName,
  isHost,
}: {
  currentUserId: string;
  currentUserName: string;
  isHost: boolean;
}) {
  const files = useStorage((root) => (root as any).sessionFiles) as SessionFile[] | null;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SessionFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getSessionFilesList = (storage: any) => {
    const current = storage.get("sessionFiles");

    if (!current) {
      const next = new LiveList<SessionFile>([]);
      storage.set("sessionFiles", next);
      return next;
    }

    if (typeof current.toArray === "function") {
      return current;
    }

    if (Array.isArray(current)) {
      const next = new LiveList<SessionFile>(current);
      storage.set("sessionFiles", next);
      return next;
    }

    const next = new LiveList<SessionFile>([]);
    storage.set("sessionFiles", next);
    return next;
  };

  const addFile = useMutation(({ storage }, file: SessionFile) => {
    getSessionFilesList(storage as any).push(file);
  }, []);

  const removeFile = useMutation(({ storage }, fileId: string) => {
    const list = getSessionFilesList(storage as any);
    const idx = (list.toArray() as SessionFile[]).findIndex((f) => f.id === fileId);
    if (idx !== -1) list.delete(idx);
  }, []);

  const toggleDownload = useMutation(({ storage }, fileId: string) => {
    const list = getSessionFilesList(storage as any);
    const arr = list.toArray() as SessionFile[];
    const idx = arr.findIndex((f) => f.id === fileId);
    if (idx !== -1) {
      list.set(idx, { ...arr[idx], allowDownload: !arr[idx].allowDownload });
    }
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "session-file");

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }

      addFile({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        url: data.url,
        type: file.type,
        size: file.size,
        uploadedBy: currentUserId,
        uploadedByName: currentUserName,
        allowDownload: true,
        uploadedAt: new Date().toISOString(),
      });
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const fileList = files ?? [];

  return (
    <>
      <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
        {/* Upload button */}
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-600 text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors text-sm disabled:opacity-50"
          >
            {uploading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
              : <><Upload className="h-4 w-4" /> Share a file</>
            }
          </button>
          <p className="text-[10px] text-slate-600 text-center mt-1">
            Images, PDF, Word, PowerPoint · max 50 MB
          </p>
          {error && <p className="text-xs text-red-400 mt-1 text-center">{error}</p>}
        </div>

        {/* File list */}
        {fileList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <FileText className="h-7 w-7 text-slate-600 mb-2" />
            <p className="text-xs text-slate-500">No files shared yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fileList.map((f) => {
              const isOwner = f.uploadedBy === currentUserId;
              const canRemove = isOwner || isHost;
              const isImage = f.type.startsWith("image/");

              return (
                <div key={f.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                  {/* Image preview thumbnail */}
                  {isImage && (
                    <button
                      onClick={() => setPreview(f)}
                      className="w-full relative h-28 overflow-hidden group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.url}
                        alt={f.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="h-5 w-5 text-white" />
                      </div>
                    </button>
                  )}

                  <div className="px-3 py-2.5 space-y-2">
                    <div className="flex items-start gap-2">
                      <FileIcon type={f.type} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-200 truncate">{f.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {formatBytes(f.size)} · {f.uploadedByName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* View / open */}
                      {isImage ? (
                        <button
                          onClick={() => setPreview(f)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-[10px] transition-colors"
                        >
                          <Eye className="h-3 w-3" /> View
                        </button>
                      ) : (
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-[10px] transition-colors"
                        >
                          <Eye className="h-3 w-3" /> Open
                        </a>
                      )}

                      {/* Download — only if allowed */}
                      {f.allowDownload && (
                        <a
                          href={f.url}
                          download={f.name}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-900/50 text-indigo-400 hover:bg-indigo-900 text-[10px] transition-colors"
                        >
                          <Download className="h-3 w-3" /> Download
                        </a>
                      )}

                      {/* Toggle download permission — owner or host */}
                      {canRemove && (
                        <button
                          onClick={() => toggleDownload(f.id)}
                          title={f.allowDownload ? "Disable download" : "Allow download"}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-colors ml-auto ${
                            f.allowDownload
                              ? "bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60"
                              : "bg-slate-700 text-slate-500 hover:bg-slate-600"
                          }`}
                        >
                          {f.allowDownload
                            ? <><Unlock className="h-3 w-3" /> DL on</>
                            : <><Lock className="h-3 w-3" /> DL off</>
                          }
                        </button>
                      )}

                      {/* Remove */}
                      {canRemove && (
                        <button
                          onClick={() => removeFile(f.id)}
                          title="Remove file"
                          className="p-1 rounded-lg text-slate-600 hover:text-red-400 hover:bg-slate-700 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full-screen image preview drawer */}
      {preview && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <p className="text-sm font-medium text-white truncate max-w-xs">{preview.name}</p>
            <div className="flex items-center gap-2">
              {preview.allowDownload && (
                <a
                  href={preview.url}
                  download={preview.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
              )}
              <button
                onClick={() => setPreview(null)}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.url}
              alt={preview.name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}
