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
import { User, Tag, Settings2, BadgeCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { appName } from "@/data/constant";

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

  const sections = [
    { id: "profile",  icon: User,      label: "Profile"  },
    { id: "topics",   icon: Tag,       label: "Topics"   },
    { id: "settings", icon: Settings2, label: "Settings" },
    ...(user.role === "learner" ? [{ id: "expert", icon: BadgeCheck, label: "Become Expert" }] : []),
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your profile, topics, privacy, and notification preferences.
        </p>
      </div>

      {/* Quick nav pills */}
      <div className="flex flex-wrap gap-2">
        {sections.map(({ id, icon: Icon, label }) => (
          <a
            key={id}
            href={`#${id}`}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </a>
        ))}
      </div>

      {/* Profile section */}
      <section id="profile" className="scroll-mt-20 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50">
            <User className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Profile</h2>
            <p className="text-xs text-slate-500">Your public identity on {appName}</p>
          </div>
        </div>
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
      </section>

      <div className="h-px bg-slate-100" />

      {/* Topics section */}
      <section id="topics" className="scroll-mt-20 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50">
            <Tag className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Topics</h2>
            <p className="text-xs text-slate-500">What you learn and what you teach — powers matching</p>
          </div>
        </div>
        <TopicsEditor
          role={user.role}
          currentTopics={currentTopics.map((t) => ({
            topicId: t.topicId,
            topicName: t.topicName ?? "",
            relationship: t.relationship,
          }))}
        />
      </section>

      <div className="h-px bg-slate-100" />

      {/* Settings section */}
      <section id="settings" className="scroll-mt-20 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
            <Settings2 className="h-4 w-4 text-slate-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Privacy & Notifications</h2>
            <p className="text-xs text-slate-500">Messaging, discovery, and notification controls</p>
          </div>
        </div>
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
      </section>

      {/* Become Expert CTA — learners only */}
      {user.role === "learner" && (
        <>
          <div className="h-px bg-slate-100" />
          <section id="expert" className="scroll-mt-20">
            <div className="overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-200">
                  <BadgeCheck className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-indigo-900">Become an Expert</h2>
                  <p className="mt-1 text-sm text-indigo-700">
                    Share your knowledge, host live sessions, and get matched with learners who need exactly what you teach.
                  </p>
                  <Button asChild size="sm" className="mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 shadow-md shadow-indigo-200 hover:opacity-90">
                    <Link href="/dashboard/become-expert">Apply to become an expert →</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
