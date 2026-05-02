"use client";

import { useActionState, useMemo, useState, useRef } from "react";
import { Save, Sparkles, Upload, Loader2 } from "lucide-react";
import { updateProfileDetails } from "@/app/actions/profile";
import { initialProfileActionState, type ProfileActionState } from "@/app/actions/profile-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActionToast } from "@/lib/use-action-toast";
import { useToast } from "@/components/ui/toast-provider";

type ProfileDetailsValues = {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  role: "learner" | "expert";
  headline: string | null;
  introImageUrl: string | null;
  introVideoUrl: string | null;
  hourlyRateCents: number | null;
  availability: Record<string, string[]> | null;
};

type AvailabilityState = Record<string, { enabled: boolean; start: string; end: string }>;

const availabilityDays = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

export function ProfileDetailsForm({ profile }: { profile: ProfileDetailsValues }) {
  const [state, formAction, isPending] = useActionState<ProfileActionState, FormData>(
    updateProfileDetails,
    initialProfileActionState
  );
  const [availability, setAvailability] = useState<AvailabilityState>(() =>
    buildAvailabilityState(profile.availability)
  );
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [introImageUrl, setIntroImageUrl] = useState(profile.introImageUrl ?? "");
  const [introVideoUrl, setIntroVideoUrl] = useState(profile.introVideoUrl ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingIntroImage, setUploadingIntroImage] = useState(false);
  const [uploadingIntroVideo, setUploadingIntroVideo] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const introImageInputRef = useRef<HTMLInputElement>(null);
  const introVideoInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  useActionToast(state);

  const uploadFile = async (
    file: File,
    purpose: "avatar" | "intro-image" | "intro-video",
    onSuccess: (url: string) => void,
    onPending: (pending: boolean) => void
  ) => {
    onPending(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", purpose);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onSuccess(data.url);
      showToast("Upload completed successfully.", "success");
    } catch (error) {
      console.error("[ProfileDetailsForm] upload error:", error);
      showToast("Upload failed. Please try again.", "error");
    } finally {
      onPending(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return;
    await uploadFile(file, "avatar", setAvatarUrl, setUploadingAvatar);
  };

  const handleIntroImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return;
    await uploadFile(file, "intro-image", setIntroImageUrl, setUploadingIntroImage);
  };

  const handleIntroVideoUpload = async (file: File) => {
    if (!file.type.startsWith("video/") || file.size > 20 * 1024 * 1024) return;
    await uploadFile(file, "intro-video", setIntroVideoUrl, setUploadingIntroVideo);
  };

  const availabilityPayload = useMemo(
    () =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(availability)
            .filter(([, v]) => v.enabled && v.start && v.end)
            .map(([day, v]) => [day, [`${v.start}-${v.end}`]])
        )
      ),
    [availability]
  );

  return (
    <form action={formAction} className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-950">Profile details</CardTitle>
          <p className="text-sm leading-6 text-slate-500">
            Update your photo, bio, and profile information. These power matching and discovery.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xl font-bold text-white">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  profile.displayName.charAt(0).toUpperCase()
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Profile photo</p>
              <p className="text-xs text-slate-500">Click the upload icon to change your photo</p>
            </div>
          </div>
          <input type="hidden" name="avatarUrl" value={avatarUrl} />

          {/* Display name + role */}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-semibold text-slate-900">Display name</label>
              <input id="displayName" name="displayName" defaultValue={profile.displayName}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Account role</p>
              <p className="mt-1 text-sm capitalize text-slate-600">{profile.role}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">Affects matching, visibility, and profile sections.</p>
            </div>
          </div>

          {/* Bio — both roles */}
          <div className="space-y-2">
            <label htmlFor="bio" className="text-sm font-semibold text-slate-900">Bio</label>
            <textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} rows={5}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
              placeholder="Tell people what you're focused on, how you learn, or what guidance you offer." />
          </div>

          {/* Headline — both roles */}
          <div className="space-y-2">
            <label htmlFor="headline" className="text-sm font-semibold text-slate-900">
              Headline <span className="text-xs font-normal text-slate-400">(optional)</span>
            </label>
            <input id="headline" name="headline" defaultValue={profile.headline ?? ""}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
              placeholder={profile.role === "expert" ? "e.g. Mathematics tutor · 5 years experience" : "e.g. CS student preparing for FAANG interviews"} />
          </div>

          {/* Expert-only fields */}
          {profile.role === "expert" ? (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="hourlyRate" className="text-sm font-semibold text-slate-900">Hourly rate (USD)</label>
                  <input id="hourlyRate" name="hourlyRate" inputMode="numeric"
                    defaultValue={profile.hourlyRateCents ? String(Math.round(profile.hourlyRateCents / 100)) : ""}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                    placeholder="0" />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-900">Intro image</label>
                  <div
                    onClick={() => introImageInputRef.current?.click()}
                    className="cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    {introImageUrl ? (
                      <div className="space-y-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={introImageUrl} alt="" className="h-32 w-full rounded-xl object-cover" />
                        <p className="text-xs text-slate-500">Click to replace image · images only · max 5 MB</p>
                      </div>
                    ) : (
                      <div className="flex min-h-32 flex-col items-center justify-center gap-2 text-center">
                        {uploadingIntroImage ? <Loader2 className="h-5 w-5 animate-spin text-indigo-500" /> : <Upload className="h-5 w-5 text-slate-400" />}
                        <p className="text-sm font-medium text-slate-700">Upload intro image</p>
                        <p className="text-xs text-slate-500">Images only · max 5 MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={introImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIntroImageUpload(f); }}
                  />
                  <input type="hidden" name="introImageUrl" value={introImageUrl} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-900">Intro video</label>
                  <div
                    onClick={() => introVideoInputRef.current?.click()}
                    className="cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    {introVideoUrl ? (
                      <div className="space-y-3">
                        <video src={introVideoUrl} controls className="h-32 w-full rounded-xl bg-black object-cover" />
                        <p className="text-xs text-slate-500">Click to replace video · videos only · max 20 MB</p>
                      </div>
                    ) : (
                      <div className="flex min-h-32 flex-col items-center justify-center gap-2 text-center">
                        {uploadingIntroVideo ? <Loader2 className="h-5 w-5 animate-spin text-indigo-500" /> : <Upload className="h-5 w-5 text-slate-400" />}
                        <p className="text-sm font-medium text-slate-700">Upload intro video</p>
                        <p className="text-xs text-slate-500">Videos only · max 20 MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={introVideoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIntroVideoUpload(f); }}
                  />
                  <input type="hidden" name="introVideoUrl" value={introVideoUrl} />
                </div>
              </div>

              {/* Availability */}
              <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Weekly availability</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Set windows when learners can book or reach you.</p>
                </div>
                <div className="space-y-3">
                  {availabilityDays.map((day) => {
                    const value = availability[day.key];
                    return (
                      <div key={day.key} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:grid-cols-[140px_1fr_1fr]">
                        <label className="flex items-center gap-3">
                          <input type="checkbox" checked={value.enabled}
                            onChange={(e) => setAvailability((c) => ({ ...c, [day.key]: { ...c[day.key], enabled: e.target.checked } }))}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm font-semibold text-slate-900">{day.label}</span>
                        </label>
                        <input type="time" value={value.start} disabled={!value.enabled}
                          onChange={(e) => setAvailability((c) => ({ ...c, [day.key]: { ...c[day.key], start: e.target.value } }))}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400" />
                        <input type="time" value={value.end} disabled={!value.enabled}
                          onChange={(e) => setAvailability((c) => ({ ...c, [day.key]: { ...c[day.key], end: e.target.value } }))}
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400" />
                      </div>
                    );
                  })}
                </div>
              </div>
              <input type="hidden" name="availability" value={availabilityPayload} />
            </>
          ) : (
            <>
              <input type="hidden" name="introImageUrl" value="" />
              <input type="hidden" name="introVideoUrl" value="" />
              <input type="hidden" name="hourlyRate" value="" />
              <input type="hidden" name="availability" value="{}" />
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Profile polish matters</p>
            <p className="mt-1 text-sm text-slate-500">A complete profile improves matching quality and discovery.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {state.message ? (
            <p className={`text-sm ${state.success ? "text-emerald-600" : "text-rose-600"}`}>{state.message}</p>
          ) : null}
          <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
            <Save className="h-4 w-4" />
            {isPending ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function buildAvailabilityState(availability: Record<string, string[]> | null | undefined): AvailabilityState {
  return Object.fromEntries(
    availabilityDays.map((day) => {
      const range = availability?.[day.key]?.[0];
      const [start = "09:00", end = "17:00"] = range?.split("-") ?? [];
      return [day.key, { enabled: Boolean(range), start, end }];
    })
  ) as AvailabilityState;
}
