import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import { ProfileDetailsForm } from "@/components/ProfileDetailsForm";
import { SettingsForm } from "@/components/SettingsForm";
import { TopicsEditor } from "@/components/TopicsEditor";
import { getExpertProfileForSettings } from "@/lib/expert-profile-compat";
import { getUserSettingsForPage } from "@/lib/user-settings-compat";
import { db } from "@/db";
import { userTopics, topics } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [settings, expertProfile, currentTopics] = await Promise.all([
    getUserSettingsForPage(user.id),
    getExpertProfileForSettings(user.id),
    db
      .select({ topicId: userTopics.topicId, topicName: topics.name, relationship: userTopics.relationship })
      .from(userTopics)
      .leftJoin(topics, eq(topics.id, userTopics.topicId))
      .where(eq(userTopics.userId, user.id)),
  ]);

  if (!settings) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Profile, topics & preferences</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Update your profile details, manage your topic graph, and control how SkillPulse matches and notifies you.
        </p>
      </section>

      <ProfileDetailsForm
        profile={{
          displayName: user.displayName,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          role: user.role,
          headline: expertProfile?.headline ?? null,
          introImageUrl: expertProfile?.introImageUrl ?? null,
          introVideoUrl: expertProfile?.introVideoUrl ?? null,
          hourlyRateCents: expertProfile?.hourlyRateCents ?? null,
          availability: expertProfile?.availability ?? null,
        }}
      />

      <TopicsEditor
        role={user.role}
        currentTopics={currentTopics.map((t) => ({
          topicId: t.topicId,
          topicName: t.topicName ?? "",
          relationship: t.relationship,
        }))}
      />

      <SettingsForm
        settings={{
          discoveryIntent: settings.discoveryIntent,
          allowDirectMessages: settings.allowDirectMessages,
          directMessagePrivacy: settings.directMessagePrivacy,
          allowGroupInvites: settings.allowGroupInvites,
          showTypingIndicators: settings.showTypingIndicators,
          showReadReceipts: settings.showReadReceipts,
          emailNotifications: settings.emailNotifications,
          inAppNotifications: settings.inAppNotifications,
          profileVisibility: settings.profileVisibility,
          searchableProfile: settings.searchableProfile,
        }}
      />
    </div>
  );
}
