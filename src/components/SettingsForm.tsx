"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { updateUserSettings } from "@/app/actions/settings";
import { initialSettingsActionState, type SettingsActionState } from "@/app/actions/settings-types";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/lib/use-action-toast";
import {
  discoveryIntentDescriptions,
  discoveryIntentLabels,
  type DiscoveryIntent,
} from "@/lib/discovery-intent";
import { appName } from "@/data/constant";

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

// Animated toggle switch — matches the pattern used in article/group forms
function Toggle({
  name,
  defaultChecked,
}: {
  name: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <>
      <input type="hidden" name={name} value={checked ? "on" : "off"} />
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => setChecked((c) => !c)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          checked ? "bg-indigo-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </>
  );
}

function SettingRow({
  name,
  title,
  description,
  defaultChecked,
}: {
  name: string;
  title: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-slate-300">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>
      <Toggle name={name} defaultChecked={defaultChecked} />
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-0.5 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function IntentCard({ value, label, description, defaultChecked }: {
  value: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label
      className={`relative flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
        checked ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
      }`}
      onClick={() => setChecked(true)}
    >
      <input
        type="radio"
        name="discoveryIntent"
        value={value}
        checked={checked}
        onChange={() => setChecked(true)}
        className="mt-0.5 h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      <div>
        <p className={`text-xs font-semibold ${checked ? "text-indigo-900" : "text-slate-900"}`}>{label}</p>
        <p className={`mt-0.5 text-[11px] leading-relaxed ${checked ? "text-indigo-700" : "text-slate-500"}`}>
          {description}
        </p>
      </div>
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
    <form action={formAction} className="space-y-8">

      {/* Discovery Intent */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <SectionHeader
            title="Discovery Intent"
            description={`Tell ${appName} why you're here so matching surfaces the right people.`}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(discoveryIntentLabels).map(([value, label]) => {
              const intent = value as DiscoveryIntent;
              return (
                <IntentCard
                  key={intent}
                  value={intent}
                  label={label}
                  description={discoveryIntentDescriptions[intent]}
                  defaultChecked={settings.discoveryIntent === intent}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Messaging */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <SectionHeader
            title="Messaging"
            description="Control who can reach you and how live chat behaves."
          />
        </div>
        <div className="divide-y divide-slate-50 px-5 py-3 space-y-0">
          <SettingRow
            name="allowDirectMessages"
            title="Allow direct messages"
            description="Let other users start a one-to-one conversation with you."
            defaultChecked={settings.allowDirectMessages}
          />
          <div className="py-3">
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Message privacy
            </label>
            <select
              name="directMessagePrivacy"
              defaultValue={settings.directMessagePrivacy}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
            >
              <option value="everyone">Everyone can message me</option>
              <option value="matches_only">Matches only</option>
              <option value="nobody">Nobody</option>
            </select>
          </div>
          <SettingRow
            name="showTypingIndicators"
            title="Typing indicators"
            description="Show when people are typing in conversations."
            defaultChecked={settings.showTypingIndicators}
          />
          <SettingRow
            name="showReadReceipts"
            title="Read receipts"
            description="Allow others to see when you've read their messages."
            defaultChecked={settings.showReadReceipts}
          />
          <SettingRow
            name="allowGroupInvites"
            title="Group invites"
            description="Let people invite you into community groups."
            defaultChecked={settings.allowGroupInvites}
          />
        </div>
      </section>

      {/* Notifications */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <SectionHeader
            title="Notifications"
            description={`Choose how ${appName} keeps you informed.`}
          />
        </div>
        <div className="px-5 py-3 space-y-0">
          <SettingRow
            name="inAppNotifications"
            title="In-app notifications"
            description="Show activity in the notification bell inside the dashboard."
            defaultChecked={settings.inAppNotifications}
          />
          <SettingRow
            name="emailNotifications"
            title="Email notifications"
            description="Receive email updates for important activity."
            defaultChecked={settings.emailNotifications}
          />
        </div>
      </section>

      {/* Visibility */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <SectionHeader
            title="Profile Visibility"
            description={`Control how discoverable you are on ${appName}.`}
          />
        </div>
        <div className="px-5 py-3 space-y-0">
          <div className="py-3">
            <label className="block text-sm font-semibold text-slate-900 mb-1.5">
              Who can see your profile
            </label>
            <select
              name="profileVisibility"
              defaultValue={settings.profileVisibility}
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
            >
              <option value="public">Public — visible to everyone</option>
              <option value="community">Community — signed-in users only</option>
              <option value="private">Private — hidden from discovery</option>
            </select>
          </div>
          <SettingRow
            name="searchableProfile"
            title="Searchable profile"
            description="Appear in search results and match recommendations."
            defaultChecked={settings.searchableProfile}
          />
        </div>
      </section>

      {/* Save */}
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Save preferences</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Changes take effect immediately across the platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {state.message && (
            <p className={`text-sm ${state.success ? "text-emerald-600" : "text-rose-600"}`}>
              {state.message}
            </p>
          )}
          <Button type="submit" disabled={isPending} className="gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 shadow-md shadow-indigo-200 hover:opacity-90">
            <Save className="h-3.5 w-3.5" />
            {isPending ? "Saving…" : "Save Settings"}
          </Button>
        </div>
      </div>
    </form>
  );
}
