import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import {
  BookOpen, Clock3, MessageSquare, Sparkles, Star,
  BadgeCheck, ArrowLeft, Calendar, Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StartConversationButton } from "@/components/StartConversationButton";
import { ConnectButton } from "@/components/ConnectButton";
import { ExpertReviews } from "@/components/ExpertReviews";
import { getExpertReviews, getUserReviewForExpert } from "@/app/actions/reviews";
import { getConnectionStatus } from "@/app/actions/connections";
import { getCurrentUser } from "@/lib/currentUser";
import { discoveryIntentLabels } from "@/lib/discovery-intent";
import { getDirectMessageEligibility } from "@/lib/messaging";
import { getDiscoverableProfile, getUserIdByUsername, isUuid } from "@/lib/profiles";
import { appName } from "@/data/constant";

export default async function ProfilePage(props: PageProps<"/profile/[userId]">) {
  const { userId } = await props.params;

  // If it's a UUID, look up the username and redirect to the clean URL
  if (isUuid(userId)) {
    const profile = await getDiscoverableProfile(userId, null);
    if (profile?.username) {
      redirect(`/profile/${profile.username}`);
    }
  }

  // If it's a username (not UUID), resolve to the actual userId
  let resolvedId = userId;
  if (!isUuid(userId)) {
    const found = await getUserIdByUsername(userId);
    if (!found) notFound();
    resolvedId = found;
  }
  const currentUser = await getCurrentUser();
  const profile = await getDiscoverableProfile(resolvedId, currentUser?.id ?? null);

  if (!profile) notFound();

  const isOwn = currentUser?.id === profile.id;

  const [canMessage, reviews, existingReview, connection] = await Promise.all([
    currentUser && !isOwn ? getDirectMessageEligibility(currentUser.id, profile.id) : Promise.resolve(null),
    profile.role === "expert" ? getExpertReviews(profile.id) : Promise.resolve([]),
    currentUser && !isOwn && profile.role === "expert" ? getUserReviewForExpert(profile.id, currentUser.id) : Promise.resolve(null),
    currentUser && !isOwn ? getConnectionStatus(currentUser.id, profile.id) : Promise.resolve(null),
  ]);

  const interestedTopics = profile.topics.filter((t) => t.relationship === "interested");
  const teachingTopics   = profile.topics.filter((t) => t.relationship === "teaches");
  const availabilityEntries = Object.entries(profile.availability ?? {});
  const canReview = !!(currentUser && !isOwn && profile.role === "expert");

  return (
    <main className="min-h-screen bg-slate-50">

      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link href="/" className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-lg font-extrabold text-transparent">
              {appName}
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">

        {/* ── HERO CARD ── */}
        <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* Gradient banner */}
          <div className="h-32 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 md:h-40" />

          <div className="px-6 pb-6">
            {/* Avatar + actions row */}
            <div className="flex flex-wrap items-end justify-between gap-4 -mt-10 mb-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-indigo-400 to-purple-500 text-2xl font-bold text-white shadow-md">
                {profile.introImageUrl || profile.avatarUrl ? (
                  <Image
                    src={profile.introImageUrl || profile.avatarUrl || ""}
                    alt={profile.displayName}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  profile.displayName.charAt(0).toUpperCase()
                )}
              </div>

              {currentUser && !isOwn && (
                <div className="flex flex-wrap items-center gap-2">
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
                    variant="outline"
                  />
                </div>
              )}
              {isOwn && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/settings">Edit profile</Link>
                </Button>
              )}
            </div>

            {/* Name + badges */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{profile.displayName}</h1>
              <Badge className={`border-0 ${
                profile.role === "expert"
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                  : "bg-amber-100 text-amber-700 hover:bg-amber-100"
              }`}>
                {profile.role}
              </Badge>
              {profile.verificationStatus === "verified" && (
                <span className="flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </span>
              )}
            </div>

            {/* Headline */}
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              {profile.headline || profile.bio || `Building momentum inside ${appName}.`}
            </p>

            {/* Intent badge */}
            {profile.discoveryIntent && (
              <div className="mt-3">
                <Badge variant="secondary" className="bg-sky-50 text-sky-700 hover:bg-sky-50">
                  <Sparkles className="mr-1 h-3 w-3" />
                  {discoveryIntentLabels[profile.discoveryIntent]}
                </Badge>
              </div>
            )}
          </div>
        </section>

        {/* ── TWO COLUMN ── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

          {/* LEFT */}
          <div className="space-y-6">

            {/* Intro video */}
            {profile.role === "expert" && profile.introVideoUrl && (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-3">
                  <p className="text-sm font-bold text-slate-900">Intro Video</p>
                </div>
                <div className="p-4">
                  <div className="overflow-hidden rounded-2xl bg-black">
                    <video controls preload="metadata" src={profile.introVideoUrl} className="aspect-video w-full" />
                  </div>
                </div>
              </div>
            )}

            {/* About */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-sm font-bold text-slate-900">About</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm leading-7 text-slate-600">
                  {profile.bio || "This member hasn't added a bio yet."}
                </p>
              </div>
            </div>

            {/* Articles */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <p className="text-sm font-bold text-slate-900">Published Articles</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  {profile.articles.length}
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {profile.articles.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-400">No published articles yet.</p>
                ) : (
                  profile.articles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/article/${article.slug}`}
                      className="flex items-center justify-between px-5 py-3.5 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors">
                          {article.title}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                          <Clock3 className="h-3 w-3" />
                          {new Date(article.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <BookOpen className="h-4 w-4 shrink-0 text-slate-300" />
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Reviews */}
            {profile.role === "expert" && (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
                  <p className="text-sm font-bold text-slate-900">Reviews</p>
                  {(profile.reviewCount ?? 0) > 0 && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {((profile.ratingAvg ?? 0) / 20).toFixed(1)} · {profile.reviewCount}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <ExpertReviews
                    expertId={profile.id}
                    reviews={reviews}
                    ratingAvg={profile.ratingAvg ?? 0}
                    reviewCount={profile.reviewCount ?? 0}
                    canReview={canReview}
                    existingReview={existingReview}
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <aside className="space-y-4">

            {/* Availability */}
            {profile.role === "expert" && (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <p className="text-sm font-bold text-slate-900">Availability</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {availabilityEntries.length === 0 ? (
                    <p className="px-5 py-4 text-xs text-slate-400">No availability shared yet.</p>
                  ) : (
                    availabilityEntries.map(([day, ranges]) => (
                      <div key={day} className="flex items-center justify-between px-5 py-2.5">
                        <p className="text-xs font-semibold capitalize text-slate-700">{day}</p>
                        <p className="text-xs text-slate-500">{(ranges as string[]).join(", ")}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Topics */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
                <Users className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-bold text-slate-900">Topics</p>
              </div>
              <div className="space-y-4 p-5">
                {teachingTopics.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                      <p className="text-xs font-semibold text-slate-600">Teaches</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {teachingTopics.map((t) => (
                        <Badge key={t.topicId} variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          {t.topicName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {interestedTopics.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 text-amber-500" />
                      <p className="text-xs font-semibold text-slate-600">Learning</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {interestedTopics.map((t) => (
                        <Badge key={t.topicId} variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
                          {t.topicName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {teachingTopics.length === 0 && interestedTopics.length === 0 && (
                  <p className="text-xs text-slate-400">No topics shared yet.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
