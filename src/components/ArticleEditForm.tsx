"use client";

import { useState, useEffect, useRef } from "react";
import { updateArticle, deleteArticle } from "@/app/actions/article";
import { Button } from "@/components/ui/button";
import { Save, Trash2, ArrowLeft, Loader2, Eye, Hash, BookOpen, Tag, ImagePlus, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/components/ui/toast-provider";

type Article = {
  id: string;
  title: string;
  content: string;
  topicId: string | null;
  coverImageUrl: string | null;
  published: boolean;
  slug: string;
};

type Topic = { id: string; name: string };

export function ArticleEditForm({ article }: { article: Article }) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [title, setTitle] = useState(article.title);
  const [content, setContent] = useState(article.content);
  const [selectedTopicId, setSelectedTopicId] = useState(article.topicId ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(article.coverImageUrl ?? "");
  const [isPublished, setIsPublished] = useState(article.published);
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const publishRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetch("/api/topics").then((r) => r.json()).then(setTopics).catch(() => {});
  }, []);

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Only image files are allowed.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be under 5 MB.", "error");
      return;
    }
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "article-cover");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setCoverImageUrl(data.url);
      else showToast(data.error ?? "Upload failed", "error");
      if (res.ok) showToast("Cover image uploaded successfully.", "success");
    } catch (error) {
      console.error("[ArticleEditForm] upload error:", error);
      showToast("Upload failed. Please try again.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (formData: FormData) => {
    setSaving(true);
    if (publishRef.current) publishRef.current.checked = isPublished;
    try { await updateArticle(formData); } catch { setSaving(false); }
  };

  const handleDelete = async (formData: FormData) => {
    if (!confirm("Delete this article? This cannot be undone.")) return;
    setDeleting(true);
    try { await deleteArticle(formData); } catch { setDeleting(false); }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/article/${article.slug}`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Edit Article</h1>
            <p className="text-xs text-slate-500">{wordCount} words</p>
          </div>
        </div>
        <form action={handleDelete}>
          <input type="hidden" name="articleId" value={article.id} />
          <button type="submit" disabled={deleting} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50">
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </button>
        </form>
      </div>

      <form action={handleSave} className="space-y-4">
        <input type="hidden" name="articleId" value={article.id} />
        <input type="hidden" name="topicId" value={selectedTopicId} />
        <input type="hidden" name="coverImageUrl" value={coverImageUrl} />
        <input ref={publishRef} type="checkbox" name="isPublished" className="hidden" defaultChecked={isPublished} />

        {/* Title */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
            <Hash className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Title</span>
          </div>
          <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required
            className="w-full px-4 py-4 text-xl font-bold text-slate-900 outline-none" />
        </div>

        {/* Content */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Content</span>
          </div>
          <textarea name="content" value={content} onChange={(e) => setContent(e.target.value)} required rows={16}
            className="w-full resize-none px-4 py-4 text-sm leading-7 text-slate-700 outline-none" />
        </div>

        {/* Cover image */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
            <ImagePlus className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Cover Image</span>
          </div>
          {coverImageUrl ? (
            <div className="relative">
              <div className="relative h-40 w-full">
                <Image src={coverImageUrl} alt="Cover" fill className="object-cover" />
              </div>
              <button type="button" onClick={() => setCoverImageUrl("")}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="cursor-pointer px-6 py-8 text-center hover:bg-slate-50 transition" onClick={() => imageInputRef.current?.click()}>
              {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mx-auto" /> : (
                <p className="text-sm text-slate-500"><span className="text-indigo-600">Click to upload</span> cover image</p>
              )}
            </div>
          )}
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
        </div>

        {/* Topic */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Topic</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSelectedTopicId("")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${selectedTopicId === "" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
              None
            </button>
            {topics.map((t) => (
              <button key={t.id} type="button" onClick={() => setSelectedTopicId(t.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${selectedTopicId === t.id ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"}`}>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600">Published</span>
            <button type="button" role="switch" aria-checked={isPublished} onClick={() => setIsPublished((p) => !p)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isPublished ? "bg-indigo-600" : "bg-slate-200"}`}>
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition ${isPublished ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
          <Button type="submit" disabled={saving} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
