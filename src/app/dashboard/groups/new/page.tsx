"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Users, Lock, MessageCircle,
  Tag, ImagePlus, X, Loader2, ShieldCheck, Hash,
} from "lucide-react";
import { createGroup } from "@/app/actions/group-management";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useToast } from "@/components/ui/toast-provider";

type Topic = { id: string; name: string };

export default function NewGroupPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [joinMode, setJoinMode] = useState<"open" | "approval_required">("open");
  const [messagingPolicy, setMessagingPolicy] = useState<"all_members" | "admins_only">("all_members");
  const [isPrivate, setIsPrivate] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then(setTopics)
      .catch(() => {});
  }, []);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { setImageUploadError("Only image files are allowed."); showToast("Only image files are allowed.", "error"); return; }
    if (file.size > 5 * 1024 * 1024) { setImageUploadError("Image must be under 5 MB."); showToast("Image must be under 5 MB.", "error"); return; }
    setImageUploadError("");
    setIsUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "group-cover");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setCoverImageUrl(data.url);
      showToast("Cover image uploaded successfully.", "success");
    } catch (err) {
      console.error("[NewGroupPage] upload error:", err);
      setImageUploadError("Upload failed. Please try again.");
      showToast("Upload failed. Please try again.", "error");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      await createGroup(formData);
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/groups"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Users className="h-3.5 w-3.5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Create a Group</h1>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Start a community with clear entry rules from the beginning</p>
        </div>
      </div>

      <form action={handleSubmit} className="space-y-4">
        {/* Hidden controlled inputs */}
        <input type="hidden" name="topicId" value={selectedTopicId} />
        <input type="hidden" name="joinMode" value={joinMode} />
        <input type="hidden" name="memberMessagingPolicy" value={messagingPolicy} />
        <input type="hidden" name="coverImageUrl" value={coverImageUrl} />
        {isPrivate && <input type="hidden" name="isPrivate" value="on" />}

        {/* Name */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
            <Hash className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Group Name</span>
          </div>
          <input
            name="name"
            required
            placeholder="e.g. Frontend Interview Lab"
            className="w-full px-4 py-4 text-lg font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-300 outline-none"
          />
        </div>

        {/* Description */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
            <MessageCircle className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Description</span>
          </div>
          <textarea
            name="description"
            required
            rows={4}
            placeholder="Describe who the group is for, what they'll do here, and how it should feel…"
            className="w-full resize-none px-4 py-4 text-sm leading-relaxed text-slate-700 placeholder:text-slate-300 outline-none"
          />
        </div>

        {/* Cover image */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
            <ImagePlus className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Cover Image</span>
            <span className="text-[10px] text-slate-400">(optional)</span>
          </div>
          {coverImageUrl ? (
            <div className="relative">
              <div className="relative h-40 w-full">
                <Image src={coverImageUrl} alt="Cover" fill className="object-cover" />
              </div>
              <button
                type="button"
                onClick={() => { setCoverImageUrl(""); if (imageInputRef.current) imageInputRef.current.value = ""; }}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div
              className="group cursor-pointer"
              onClick={() => imageInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageUpload(f); }}
            >
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-8 transition group-hover:bg-slate-50">
                {isUploadingImage ? (
                  <><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /><p className="text-sm text-slate-500">Uploading…</p></>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 ring-1 ring-indigo-100 transition group-hover:ring-indigo-300">
                      <svg viewBox="0 0 40 40" fill="none" className="h-6 w-6" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="10" width="32" height="22" rx="4" fill="#eef2ff" stroke="#a5b4fc" strokeWidth="1.5"/>
                        <circle cx="13" cy="18" r="3" fill="#a5b4fc"/>
                        <path d="M4 28l8-7 5 5 6-6 13 10" stroke="#818cf8" strokeWidth="1.5" strokeLinejoin="round"/>
                        <path d="M26 6v10M22 10l4-4 4 4" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-700"><span className="text-indigo-600">Click to upload</span> or drag & drop</p>
                      <p className="mt-0.5 text-xs text-slate-400">PNG, JPG, WebP · max 10 MB</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {imageUploadError && (
            <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">{imageUploadError}</p>
          )}
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
        </div>

        {/* Topic */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Topic</span>
            <span className="text-[10px] text-slate-400">(optional)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSelectedTopicId("")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${selectedTopicId === "" ? "bg-slate-900 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
              None
            </button>
            {topics.map((t) => (
              <button key={t.id} type="button" onClick={() => setSelectedTopicId(t.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${selectedTopicId === t.id ? "bg-indigo-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"}`}>
                {t.name}
              </button>
            ))}
            {topics.length === 0 && <p className="text-xs italic text-slate-400">Loading topics…</p>}
          </div>
        </div>

        {/* Entry mode */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Entry Mode</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "open", label: "Open Entry", desc: "Anyone can join instantly", icon: Users },
              { value: "approval_required", label: "Approval Required", desc: "Admin reviews each request", icon: ShieldCheck },
            ] as const).map(({ value, label, desc, icon: Icon }) => (
              <button key={value} type="button" onClick={() => setJoinMode(value)}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${joinMode === value ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${joinMode === value ? "text-indigo-600" : "text-slate-400"}`} />
                  <span className={`text-xs font-semibold ${joinMode === value ? "text-indigo-700" : "text-slate-700"}`}>{label}</span>
                </div>
                <p className="text-[11px] text-slate-500">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Messaging policy */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Messaging Policy</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "all_members", label: "All Members", desc: "Everyone approved can post" },
              { value: "admins_only", label: "Admins Only", desc: "Only admins can send messages" },
            ] as const).map(({ value, label, desc }) => (
              <button key={value} type="button" onClick={() => setMessagingPolicy(value)}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${messagingPolicy === value ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
                <span className={`text-xs font-semibold ${messagingPolicy === value ? "text-indigo-700" : "text-slate-700"}`}>{label}</span>
                <p className="text-[11px] text-slate-500">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Private toggle */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${isPrivate ? "bg-indigo-100" : "bg-slate-100"}`}>
              <Lock className={`h-4 w-4 ${isPrivate ? "text-indigo-600" : "text-slate-400"}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Private group</p>
              <p className="text-xs text-slate-500">Hidden from public discovery</p>
            </div>
          </div>
          <button type="button" role="switch" aria-checked={isPrivate} onClick={() => setIsPrivate((p) => !p)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${isPrivate ? "bg-indigo-600" : "bg-slate-200"}`}>
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ${isPrivate ? "translate-x-4" : "translate-x-0"}`} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/groups">Cancel</Link>
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 shadow-md shadow-indigo-500/20 hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            {isSubmitting ? "Creating…" : "Create Group"}
          </Button>
        </div>
      </form>
    </div>
  );
}
