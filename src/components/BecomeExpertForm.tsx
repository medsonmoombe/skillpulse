"use client";

import { useActionState, useRef, useState } from "react";
import { submitExpertApplication } from "@/app/actions/become-expert";
import { initialBecomeExpertState } from "@/app/actions/become-expert-types";
import { Upload, CheckCircle, Loader2, BadgeCheck, Briefcase, Link as LinkIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useActionToast } from "@/lib/use-action-toast";
import { useToast } from "@/components/ui/toast-provider";

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" disabled={pending} className="w-full bg-indigo-600 hover:bg-indigo-700">
      {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Application"}
    </Button>
  );
}

export function BecomeExpertForm({ existingApplication }: {
  existingApplication: { status: string; headline: string } | null;
}) {
  const [state, action, pending] = useActionState(submitExpertApplication, initialBecomeExpertState);
  const [credentialUrl, setCredentialUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  useActionToast(state);

  const handleCredentialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "credential");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setCredentialUrl(data.url);
        showToast("Credential uploaded successfully.", "success");
      } else {
        const data = await res.json().catch(() => ({ error: "Upload failed" }));
        showToast(data.error ?? "Upload failed", "error");
      }
    } catch (error) {
      console.error("[BecomeExpertForm] upload error:", error);
      showToast("Upload failed. Please try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  if (existingApplication?.status === "pending" && !state.success) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <Loader2 className="h-6 w-6 text-amber-600 animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-amber-900">Application Under Review</h3>
        <p className="mt-2 text-sm text-amber-700">
          Your application for <strong>{existingApplication.headline}</strong> is being reviewed. We'll notify you once it's processed.
        </p>
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle className="h-6 w-6 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-emerald-900">Application Submitted!</h3>
        <p className="mt-2 text-sm text-emerald-700">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="credentialUrl" value={credentialUrl} />

      {state.message && !state.success && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {/* Headline */}
      <div className="space-y-2">
        <Label htmlFor="headline" className="flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-indigo-500" /> Professional Headline *
        </Label>
        <Input
          id="headline"
          name="headline"
          placeholder="e.g. Senior Software Engineer · 8 years React & Node.js"
          required
          maxLength={150}
        />
        <p className="text-xs text-slate-400">This appears on your public profile and match cards.</p>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio" className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-500" /> Teaching Bio *
        </Label>
        <Textarea
          id="bio"
          name="bio"
          placeholder="Describe your expertise, teaching style, and what learners can expect from your sessions..."
          required
          rows={5}
          maxLength={1000}
        />
      </div>

      {/* Years experience */}
      <div className="space-y-2">
        <Label htmlFor="yearsExperience" className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-indigo-500" /> Years of Experience *
        </Label>
        <Input
          id="yearsExperience"
          name="yearsExperience"
          type="number"
          min={1}
          max={50}
          placeholder="e.g. 5"
          required
        />
      </div>

      {/* LinkedIn */}
      <div className="space-y-2">
        <Label htmlFor="linkedinUrl" className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-indigo-500" /> LinkedIn Profile
        </Label>
        <Input
          id="linkedinUrl"
          name="linkedinUrl"
          type="url"
          placeholder="https://linkedin.com/in/yourprofile"
        />
      </div>

      {/* Portfolio */}
      <div className="space-y-2">
        <Label htmlFor="portfolioUrl" className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-indigo-500" /> Portfolio / Website
        </Label>
        <Input
          id="portfolioUrl"
          name="portfolioUrl"
          type="url"
          placeholder="https://yourportfolio.com"
        />
      </div>

      {/* Credential upload */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-indigo-500" /> Supporting Credential
        </Label>
        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 transition hover:border-indigo-300 hover:bg-indigo-50/30"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          ) : credentialUrl ? (
            <>
              <CheckCircle className="h-6 w-6 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-700">Credential uploaded ✓</p>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-slate-400" />
              <p className="text-sm font-medium text-slate-600">Upload certificate, degree, or credential</p>
              <p className="text-xs text-slate-400">PDF, image, or document · max 50MB</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleCredentialUpload} />
        <p className="text-xs text-slate-400">Optional but strongly recommended. Verified credentials increase your match score.</p>
      </div>

      <SubmitButton pending={pending} />
    </form>
  );
}
