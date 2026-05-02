"use client";

import { useState, useRef } from "react";
import { updateGroup } from "@/app/actions/group";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2, ImagePlus, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/components/ui/toast-provider";

type Group = {
  id: string;
  name: string;
  description: string;
  slug: string;
  coverImageUrl: string | null;
};

export function GroupEditForm({ group }: { group: Group }) {
  const [coverImageUrl, setCoverImageUrl] = useState(group.coverImageUrl ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

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
      fd.append("purpose", "group-cover");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setCoverImageUrl(data.url);
      else showToast(data.error ?? "Upload failed", "error");
      if (res.ok) showToast("Cover image uploaded successfully.", "success");
    } catch (error) {
      console.error("[GroupEditForm] upload error:", error);
      showToast("Upload failed. Please try again.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setSaving(true);
    try { await updateGroup(formData); } catch { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/groups/${group.slug}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Edit Group</h1>
          <p className="text-xs text-slate-500">{group.name}</p>
        </div>
      </div>

      <form action={handleSubmit} className="space-y-4">
        <input type="hidden" name="groupId" value={group.id} />
        <input type="hidden" name="coverImageUrl" value={coverImageUrl} />

        {/* Name */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-2.5">
            <span className="text-xs font-medium text-slate-500">Group Name</span>
          </div>
          <input name="name" defaultValue={group.name} required
            className="w-full px-4 py-4 text-lg font-bold text-slate-900 outline-none" />
        </div>

        {/* Description */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-2.5">
            <span className="text-xs font-medium text-slate-500">Description</span>
          </div>
          <textarea name="description" defaultValue={group.description} required rows={4}
            className="w-full resize-none px-4 py-4 text-sm leading-relaxed text-slate-700 outline-none" />
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
            <div className="cursor-pointer px-6 py-8 text-center hover:bg-slate-50 transition"
              onClick={() => imageInputRef.current?.click()}>
              {isUploading
                ? <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mx-auto" />
                : <p className="text-sm text-slate-500"><span className="text-indigo-600">Click to upload</span> cover image</p>
              }
            </div>
          )}
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={`/dashboard/groups/${group.slug}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
