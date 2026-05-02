"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateUserSettings } from "@/app/actions/settings";
import { initialSettingsActionState, type SettingsActionState } from "@/app/actions/settings-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActionToast } from "@/lib/use-action-toast";
import {
  discoveryIntentDescriptions,
  discoveryIntentLabels,
  type DiscoveryIntent,
} from "@/lib/discovery-intent";

type UserSettingsValues = {
  discoveryIntent: DiscoveryIntent | null;
  allowDirectMessages: boolean;
  directMessagePrivacy: "everyone" | "matches_only" | "nobody";
  allowGroupInvites: boolean;
  showTypingIndicators: boolean;
  showReadReceipts: boolean;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  profileVisibility: "public" | "community" | "private";
  searchableProfile: boolean;
};

function ToggleRow({
  name,
  title,
  description,
  defaultChecked,
}: {
  name: keyof UserSettingsValues;
  title: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-slate-300">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
    </label>
  );
}

export function SettingsForm({ settings }: { settings: UserSettingsValues }) {
  const [state, formAction, isPending] = useActionState<SettingsActionState, FormData>(
    updateUserSettings,
    initialSettingsActionState
  );
  useActionToast(state);

  return (
    <form action={formAction} className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-950">Discovery intent</CardTitle>
          <p className="text-sm leading-6 text-slate-500">
            Tell SkillPulse why you are here so matching and the home experience can prioritize the right people.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <label htmlFor="discoveryIntent" className="block text-sm font-semibold text-slate-900">
              Primary intent
            </label>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Learners use this to describe their goal, and experts use it to describe the kind of people they help best.
            </p>
            <select
              id="discoveryIntent"
              name="discoveryIntent"
              defaultValue={settings.discoveryIntent ?? "career_growth"}
              className="mt-4 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
            >
              {Object.entries(discoveryIntentLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Object.entries(discoveryIntentLabels).map(([value, label]) => (
                <div key={value} className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {discoveryIntentDescriptions[value as DiscoveryIntent]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-950">Messaging</CardTitle>
          <p className="text-sm leading-6 text-slate-500">
            Control who can reach you and how live chat behaves inside SkillPulse.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            name="allowDirectMessages"
            title="Allow direct messages"
            description="Let other users start a one-to-one conversation with you."
            defaultChecked={settings.allowDirectMessages}
          />

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <label htmlFor="directMessagePrivacy" className="block text-sm font-semibold text-slate-900">
              Direct message privacy
            </label>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Decide whether everyone, only strong matches, or nobody can message you.
            </p>
            <select
              id="directMessagePrivacy"
              name="directMessagePrivacy"
              defaultValue={settings.directMessagePrivacy}
              className="mt-4 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
            >
              <option value="everyone">Everyone</option>
              <option value="matches_only">Matches only</option>
              <option value="nobody">Nobody</option>
            </select>
          </div>

          <ToggleRow
            name="showTypingIndicators"
            title="Show typing indicators"
            description="Display when people are typing in direct and group conversations."
            defaultChecked={settings.showTypingIndicators}
          />

          <ToggleRow
            name="showReadReceipts"
            title="Show read receipts"
            description="Allow the app to show when you have seen messages."
            defaultChecked={settings.showReadReceipts}
          />

          <ToggleRow
            name="allowGroupInvites"
            title="Allow group invites"
            description="Let people invite you into community groups and future group chats."
            defaultChecked={settings.allowGroupInvites}
          />
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-950">Notifications</CardTitle>
          <p className="text-sm leading-6 text-slate-500">
            Choose how SkillPulse keeps you informed about messages, bookings, and matches.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            name="inAppNotifications"
            title="In-app notifications"
            description="Show activity in the notification drawer inside the dashboard."
            defaultChecked={settings.inAppNotifications}
          />

          <ToggleRow
            name="emailNotifications"
            title="Email notifications"
            description="Receive email updates for important activity when email delivery is added."
            defaultChecked={settings.emailNotifications}
          />
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-950">Profile visibility</CardTitle>
          <p className="text-sm leading-6 text-slate-500">
            Shape how discoverable you are as we build smarter matching for learners and experts.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <label htmlFor="profileVisibility" className="block text-sm font-semibold text-slate-900">
              Profile visibility
            </label>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Public profiles are open to everyone, community profiles are limited to signed-in users, and private
              profiles stay hidden from discovery.
            </p>
            <select
              id="profileVisibility"
              name="profileVisibility"
              defaultValue={settings.profileVisibility}
              className="mt-4 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
            >
              <option value="public">Public</option>
              <option value="community">Community only</option>
              <option value="private">Private</option>
            </select>
          </div>

          <ToggleRow
            name="searchableProfile"
            title="Searchable profile"
            description="Allow your profile to appear in search results, recommendations, and future matching flows."
            defaultChecked={settings.searchableProfile}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Save your preferences</p>
          <p className="mt-1 text-sm text-slate-500">
            These settings are the base layer for messaging permissions, notifications, and future discovery.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {state.message ? (
            <p className={`text-sm ${state.success ? "text-emerald-600" : "text-rose-600"}`}>{state.message}</p>
          ) : null}
          <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
            <Save className="h-4 w-4" />
            {isPending ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </div>
    </form>
  );
}
