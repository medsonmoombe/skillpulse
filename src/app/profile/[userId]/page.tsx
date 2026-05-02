import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Clock3, MessageSquare, Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StartConversationButton } from "@/components/StartConversationButton";
import { ConnectButton } from "@/components/ConnectButton";
import { ExpertReviews } from "@/components/ExpertReviews";
import { getExpertReviews, getUserReviewForExpert } from "@/app/actions/reviews";
import { getConnectionStatus } from "@/app/actions/connections";
import { getCurrentUser } from "@/lib/currentUser";
import { discoveryIntentLabels } from "@/lib/discovery-intent";
import { getDirectMessageEligibility } from "@/lib/messaging";
import { getDiscoverableProfile } from "@/lib/profiles";

export default async function ProfilePage(props: PageProps<"/profile/[userId]">) {
  const { userId } = await props.params;
  const currentUser = await getCurrentUser();
  const profile = await getDiscoverableProfile(userId, currentUser?.id ?? null);

  if (!profile) {
    notFound();
  }

  const canMessage =
    currentUser && currentUser.id !== profile.id
      ? await getDirectMessageEligibility(currentUser.id, profile.id)
      : null;

  const reviews = profile.role === "expert" ? await getExpertReviews(profile.id) : [];
  const canReview = !!(currentUser && currentUser.id !== profile.id && profile.role === "expert");
  const existingReview = canReview && currentUser
    ? await getUserReviewForExpert(profile.id, currentUser.id)
    : null;
  const connection = currentUser && currentUser.id !== profile.id
    ? await getConnectionStatus(currentUser.id, profile.id)
    : null;

  const interestedTopics = profile.topics.filter((topic) => topic.relationship === "interested");
  const teachingTopics = profile.topics.filter((topic) => topic.relationship === "teaches");
  const availabilityEntries = Object.entries(profile.availability ?? {});

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between border-b bg-white px-6">
        <Link
          href="/"
          className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-xl font-extrabold text-transparent"
        >
          SkillPulse
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 md:px-6">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(224,231,255,0.6),_transparent_35%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] px-6 py-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 text-2xl font-semibold text-white">
                  {profile.introImageUrl || profile.avatarUrl ? (
                    <img
                      src={profile.introImageUrl || profile.avatarUrl || ""}
                      alt={profile.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    profile.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-3xl font-bold text-slate-900">{profile.displayName}</h1>
                    <Badge
                      className={`border-0 ${
                        profile.role === "expert"
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                      }`}
                    >
                      {profile.role}
                    </Badge>
                    {profile.verificationStatus === "verified" ? (
                      <Badge className="border-0 bg-slate-900 text-white hover:bg-slate-900">Verified</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-base text-slate-600">
                    {profile.headline || profile.bio || "Building momentum inside SkillPulse."}
                  </p>
                  {profile.discoveryIntent ? (
                    <div className="mt-4">
                      <Badge variant="secondary" className="bg-sky-50 text-sky-700 hover:bg-sky-50">
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                        {discoveryIntentLabels[profile.discoveryIntent]}
                      </Badge>
                    </div>
                  ) : null}
                </div>
              </div>

              {currentUser && currentUser.id !== profile.id ? (
                <div className="flex flex-wrap items-center gap-2 w-full max-w-xs">
                  <ConnectButton
                    targetUserId={profile.id}
                    connection={connection ? { id: connection.id, status: connection.status, requesterId: connection.requesterId } : null}
                    currentUserId={currentUser.id}
                  />
                  <StartConversationButton
                    targetUserId={profile.id}
                    disabled={canMessage?.allowed === false}
                    disabledReason={canMessage?.reason}
                    label="Message"
                    className="bg-slate-100 text-slate-700 hover:bg-slate-200"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            {profile.role === "expert" && profile.introVideoUrl ? (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-950">Intro media</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
                    <video
                      controls
                      preload="metadata"
                      src={profile.introVideoUrl}
                      className="aspect-video w-full"
                    />
                  </div>
                  <p className="text-sm text-slate-500">
                    This expert has added a short intro so learners can get a stronger feel for their teaching style.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-slate-950">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-slate-600">
                  {profile.bio || "This member has not added a longer bio yet, but their topic graph and activity are already helping shape discovery."}
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-slate-950">Published Articles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.articles.length === 0 ? (
                  <p className="text-sm text-slate-500">No published articles yet.</p>
                ) : (
                  profile.articles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/article/${article.slug}`}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-indigo-200 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{article.title}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                          <Clock3 className="h-3.5 w-3.5" />
                          {new Date(article.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Reviews — only for experts */}
            {profile.role === "expert" && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-950">Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <ExpertReviews
                    expertId={profile.id}
                    reviews={reviews}
                    ratingAvg={profile.ratingAvg ?? 0}
                    reviewCount={profile.reviewCount ?? 0}
                    canReview={canReview}
                    existingReview={existingReview}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {profile.role === "expert" ? (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-950">Availability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {availabilityEntries.length === 0 ? (
                    <p className="text-sm text-slate-500">No availability shared yet.</p>
                  ) : (
                    availabilityEntries.map(([day, ranges]) => (
                      <div
                        key={day}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
                      >
                        <p className="text-sm font-semibold capitalize text-slate-900">{day}</p>
                        <p className="text-sm text-slate-500">{ranges.join(", ")}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ) : null}

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-slate-950">Topic Graph</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-semibold text-slate-900">Interested in</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {interestedTopics.length === 0 ? (
                      <p className="text-sm text-slate-500">No learning topics shared yet.</p>
                    ) : (
                      interestedTopics.map((topic) => (
                        <Badge key={topic.topicId} variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
                          {topic.topicName}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-emerald-500" />
                    <p className="text-sm font-semibold text-slate-900">Teaches</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {teachingTopics.length === 0 ? (
                      <p className="text-sm text-slate-500">No teaching topics shared yet.</p>
                    ) : (
                      teachingTopics.map((topic) => (
                        <Badge key={topic.topicId} variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          {topic.topicName}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
