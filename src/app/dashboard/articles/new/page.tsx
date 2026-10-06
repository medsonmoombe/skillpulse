"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { createArticle } from "@/app/actions/article";
import {
  ArrowLeft,
  PenLine,
  BookOpen,
  Lightbulb,
  Tag,
  Eye,
  FileText,
  Send,
  Save,
  CheckCircle2,
  Clock,
  Hash,
  ImagePlus,
  X,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/components/ui/toast-provider";
import { appName } from "@/data/constant";

type Topic = { id: string; name: string };

export default function NewArticlePage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<"publish" | "draft">("publish");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const publishCheckboxRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then(setTopics)
      .catch(() => {});
  }, []);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setImageUploadError("Only image files are allowed.");
      showToast("Only image files are allowed.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError("Image must be under 5 MB.");
      showToast("Image must be under 5 MB.", "error");
      return;
    }
    setImageUploadError("");
    setIsUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "article-cover");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setCoverImageUrl(data.url);
      showToast("Cover image uploaded successfully.", "success");
    } catch (err) {
      console.error("[NewArticlePage] upload error:", err);
      setImageUploadError("Upload failed. Please try again.");
      showToast("Upload failed. Please try again.", "error");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    if (publishCheckboxRef.current) {
      publishCheckboxRef.current.checked = submitMode === "publish";
    }
    try {
      await createArticle(formData);
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link> */}
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <PenLine className="h-3.5 w-3.5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-slate-900">Write an Article</h1>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Share your expertise with the {appName} community</p>
          </div>
        </div>

        {/* Live stats */}
        <div className="hidden items-center gap-4 sm:flex">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <FileText className="h-3.5 w-3.5" />
            <span>{wordCount} words</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{readTime} min read</span>
          </div>
        </div>
      </div>

      <form action={handleSubmit}>
        {/* Hidden inputs for controlled state */}
        <input type="hidden" name="topicId" value={selectedTopicId} />
        <input type="hidden" name="coverImageUrl" value={coverImageUrl} />
        <input ref={publishCheckboxRef} type="checkbox" name="isPublished" className="hidden" defaultChecked />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          {/* ── LEFT: Editor ── */}
          <div className="space-y-4">
            {/* Title */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                <Hash className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-500">Article Title</span>
              </div>
              <input
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., 5 Ways to Master React Hooks"
                required
                className="w-full px-4 py-4 text-xl font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-300 outline-none"
              />
            </div>

            {/* Content */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">Content</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>{wordCount} words</span>
                  <span>·</span>
                  <span>{readTime} min read</span>
                </div>
              </div>
              <textarea
                name="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing your article here...&#10;&#10;Use line breaks to separate paragraphs. Share your insights, tips, and expertise clearly."
                required
                className="min-h-[420px] w-full resize-none px-4 py-4 text-sm leading-7 text-slate-700 placeholder:text-slate-300 outline-none"
              />
              {/* Bottom bar */}
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2">
                <p className="text-[11px] text-slate-400">Use line breaks for paragraphs</p>
                <div
                  className={`text-[11px] font-medium ${
                    content.length > 8000 ? "text-red-500" : "text-slate-400"
                  }`}
                >
                  {content.length} / 10,000
                </div>
              </div>
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
                  <div className="relative h-48 w-full">
                    <Image
                      src={coverImageUrl}
                      alt="Cover"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setCoverImageUrl(""); if (imageInputRef.current) imageInputRef.current.value = ""; }}
                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2">
                    <p className="text-[11px] text-slate-400">Cover image uploaded ✓</p>
                  </div>
                </div>
              ) : (
                <div
                  className="group relative cursor-pointer"
                  onClick={() => imageInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleImageUpload(file);
                  }}
                >
                  <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 transition group-hover:bg-slate-50">
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                        <p className="text-sm text-slate-500">Uploading…</p>
                      </>
                    ) : (
                      <>
                        {/* Upload illustration */}
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 ring-1 ring-indigo-100 transition group-hover:ring-indigo-300">
                          <svg viewBox="0 0 40 40" fill="none" className="h-7 w-7" xmlns="http://www.w3.org/2000/svg">
                            <rect x="4" y="10" width="32" height="22" rx="4" fill="#eef2ff" stroke="#a5b4fc" strokeWidth="1.5"/>
                            <circle cx="13" cy="18" r="3" fill="#a5b4fc"/>
                            <path d="M4 28l8-7 5 5 6-6 13 10" stroke="#818cf8" strokeWidth="1.5" strokeLinejoin="round"/>
                            <path d="M26 6v10M22 10l4-4 4 4" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-slate-700">
                            <span className="text-indigo-600">Click to upload</span> or drag & drop
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">PNG, JPG, WebP · max 10 MB</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {imageUploadError && (
                <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">
                  {imageUploadError}
                </p>
              )}

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
            </div>

            {/* Topic selector */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-500">Topic</span>
                <span className="text-[10px] text-slate-400">(optional)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTopicId("")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    selectedTopicId === ""
                      ? "bg-slate-900 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  None
                </button>
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setSelectedTopicId(topic.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      selectedTopicId === topic.id
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                    }`}
                  >
                    {topic.name}
                  </button>
                ))}
                {topics.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Loading topics…</p>
                )}
              </div>
            </div>

            {/* Actions row */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <Eye className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">Publish immediately</span>
                {/* Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={submitMode === "publish"}
                  onClick={() => setSubmitMode((m) => (m === "publish" ? "draft" : "publish"))}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    submitMode === "publish" ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${
                      submitMode === "publish" ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <span
                  className={`text-xs font-medium ${
                    submitMode === "publish" ? "text-indigo-600" : "text-slate-400"
                  }`}
                >
                  {submitMode === "publish" ? "Live" : "Draft"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => setSubmitMode("draft")}
                  className="gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSubmitting && submitMode === "draft" ? "Saving…" : "Save Draft"}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => setSubmitMode("publish")}
                  className="gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 hover:opacity-90 border-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSubmitting && submitMode === "publish" ? "Publishing…" : "Publish Article"}
                </Button>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Sidebar ── */}
          <div className="space-y-4">
            {/* Live preview card */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                <Eye className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-500">Preview</span>
              </div>
              {coverImageUrl && (
                <div className="relative h-28 w-full">
                  <Image src={coverImageUrl} alt="Cover preview" fill className="object-cover" />
                </div>
              )}
              <div className="p-4">
                {selectedTopic && (
                  <span className="mb-2 inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
                    {selectedTopic.name}
                  </span>
                )}
                <h3 className="text-sm font-bold leading-snug text-slate-900 line-clamp-3">
                  {title || <span className="text-slate-300 font-normal">Your title will appear here…</span>}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-4">
                  {content || <span className="text-slate-300">Your content preview will appear here…</span>}
                </p>
                {wordCount > 0 && (
                  <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="h-3 w-3" /> {readTime} min read
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <FileText className="h-3 w-3" /> {wordCount} words
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Writing tips */}
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <span className="text-xs font-semibold text-amber-800">Writing Tips</span>
              </div>
              <ul className="space-y-2">
                {[
                  "Start with a clear, specific title",
                  "Open with the problem you're solving",
                  "Use short paragraphs for readability",
                  "Include real examples or code snippets",
                  "End with a clear takeaway or next step",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-[11px] leading-relaxed text-amber-700">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Status card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    submitMode === "publish" ? "bg-green-500 animate-pulse" : "bg-slate-300"
                  }`}
                />
                <span className="text-xs font-medium text-slate-700">
                  {submitMode === "publish" ? "Will be published" : "Will be saved as draft"}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                {submitMode === "publish"
                  ? "Your article will be visible on the public feed immediately after submission."
                  : "Your article will be saved privately. You can publish it later from your dashboard."}
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
