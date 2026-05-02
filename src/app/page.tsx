import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, BookOpen, Clock, Users, Zap, BadgeCheck, MessageSquare } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StartConversationButton } from "@/components/StartConversationButton";
import { getCurrentUser } from "@/lib/currentUser";
import { discoveryIntentLabels } from "@/lib/discovery-intent";
import { getFeedArticlesForUser } from "@/lib/feed";
import { getDirectMessageEligibility } from "@/lib/messaging";
import { getUserDiscoveryIntent } from "@/lib/user-settings-compat";

export default async function Home() {
  const { userId } = await auth();
  const currentUser = userId ? await getCurrentUser() : null;

  const [feedArticles, viewerSettings] = await Promise.all([
    getFeedArticlesForUser(currentUser?.id ?? null, 12),
    currentUser ? getUserDiscoveryIntent(currentUser.id) : Promise.resolve(null),
  ]);

  const directMessageEligibility = new Map<string, Awaited<ReturnType<typeof getDirectMessageEligibility>>>();

  if (currentUser) {
    const uniqueAuthorIds = Array.from(
      new Set(
        feedArticles
          .map((a) => a.authorId)
          .filter((id): id is string => Boolean(id) && id !== currentUser.id)
      )
    );
    const results = await Promise.all(
      uniqueAuthorIds.map(async (id) => [id, await getDirectMessageEligibility(currentUser.id, id)] as const)
    );
    for (const [id, eligibility] of results) directMessageEligibility.set(id, eligibility);
  }

  const totalReactions = feedArticles.reduce(
    (sum, a) => sum + a.fireCount + a.lightbulbCount + a.heartCount,
    0
  );

  return (
    <main className="min-h-screen bg-slate-50">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-xl font-extrabold text-transparent">
            SkillPulse
          </Link>
          <div className="flex items-center gap-3">
            {userId ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard" className="gap-1.5">
                    Dashboard <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <UserButton />
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">Get Started</Button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden border-b bg-white">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-100/60 to-purple-100/60 blur-3xl" />
          <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-gradient-to-br from-sky-100/40 to-indigo-100/40 blur-2xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center md:px-6 md:py-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
            <Zap className="h-3.5 w-3.5" /> Where skills meet real people
          </div>

          <h1 className="mb-5 text-5xl font-extrabold tracking-tight text-slate-900 md:text-6xl lg:text-7xl">
            Grow Faster.
            <br />
            <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
              Together.
            </span>
          </h1>
          <p className="mx-auto mb-6 max-w-2xl text-lg text-slate-600 md:text-xl leading-relaxed">
            SkillPulse connects <strong className="text-slate-800">learners</strong> with <strong className="text-slate-800">expert mentors</strong> through live interactive sessions, shared whiteboards, and a knowledge feed — all in one place.
          </p>

          {/* Feature pills */}
          <div className="mx-auto mb-10 flex max-w-2xl flex-wrap justify-center gap-2 text-sm">
            {[
              { icon: "🎙️", text: "Live audio rooms" },
              { icon: "🖊️", text: "Shared whiteboards" },
              { icon: "💬", text: "Real-time messaging" },
              { icon: "📚", text: "Expert articles" },
              { icon: "🤝", text: "Smart matching" },
              { icon: "👥", text: "Topic-based groups" },
            ].map(({ icon, text }) => (
              <span key={text} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 shadow-sm">
                <span>{icon}</span> {text}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {!userId ? (
              <>
                <SignUpButton mode="modal">
                  <Button size="lg" className="gap-2 bg-indigo-600 px-8 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20">
                    Start Learning Free <ArrowRight className="h-4 w-4" />
                  </Button>
                </SignUpButton>
                <Button size="lg" variant="outline" asChild>
                  <a href="#feed">Browse Articles</a>
                </Button>
              </>
            ) : (
              <Button size="lg" className="gap-2 bg-indigo-600 px-8 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20" asChild>
                <Link href="/dashboard">Go to Dashboard <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            )}
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-2 gap-4 border-t pt-12 sm:grid-cols-4">
            {[
              { icon: BookOpen,      label: "Expert Articles",    value: `${feedArticles.length}+`,  desc: "Written by verified experts" },
              { icon: Users,         label: "Live Sessions",      value: "Always On",                desc: "Host or join anytime"        },
              { icon: Zap,           label: "Smart Matching",     value: "AI-Powered",               desc: "Find your perfect mentor"    },
              { icon: MessageSquare, label: "Community Reactions",value: `${totalReactions}+`,       desc: "Across all articles"         },
            ].map(({ icon: Icon, label, value, desc }) => (
              <div key={label} className="flex flex-col items-center gap-2 rounded-2xl bg-slate-50 px-4 py-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                  <Icon className="h-5 w-5 text-indigo-600" />
                </div>
                <p className="text-xl font-bold text-slate-900">{value}</p>
                <p className="text-xs font-semibold text-slate-700">{label}</p>
                <p className="text-[11px] text-slate-400 text-center">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">How SkillPulse Works</h2>
            <p className="mt-2 text-slate-500">Three types of users, one powerful platform.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                emoji: "🎓",
                title: "Learners",
                color: "bg-amber-50 border-amber-200",
                badge: "bg-amber-100 text-amber-700",
                points: [
                  "Get matched with experts who teach your topics",
                  "Join live sessions with shared whiteboards",
                  "Ask questions in real-time audio rooms",
                  "Read curated articles ranked to your interests",
                  "Connect with peers who share your goals",
                ],
              },
              {
                emoji: "⚡",
                title: "Experts",
                color: "bg-indigo-50 border-indigo-200",
                badge: "bg-indigo-100 text-indigo-700",
                points: [
                  "Host unlimited live teaching sessions",
                  "Draw and explain on a shared whiteboard",
                  "Publish articles to build your reputation",
                  "Get matched with learners who need your skills",
                  "Manage your own groups and communities",
                ],
              },
              {
                emoji: "👥",
                title: "Communities",
                color: "bg-purple-50 border-purple-200",
                badge: "bg-purple-100 text-purple-700",
                points: [
                  "Create topic-based groups for any subject",
                  "Host group live sessions open to members",
                  "Share resources and articles within the group",
                  "Approve or open membership to anyone",
                  "Build a focused learning community",
                ],
              },
            ].map(({ emoji, title, color, badge, points }) => (
              <div key={title} className={`rounded-2xl border-2 p-6 ${color}`}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-3xl">{emoji}</span>
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${badge}`}>{title}</span>
                </div>
                <ul className="space-y-2.5">
                  {points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="mt-0.5 text-slate-400">→</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEED ── */}
      <section id="feed" className="mx-auto max-w-7xl px-4 py-14 md:px-6">

        {/* Feed header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
              {currentUser ? "Recommended For You" : "Latest Insights"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {currentUser
                ? "Ranked with your topics, expert signals, and discovery intent in mind."
                : "Expert-written articles to level up your skills."}
            </p>
          </div>
          {userId && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/articles/new" className="gap-2">
                <BookOpen className="h-4 w-4" /> Write Article
              </Link>
            </Button>
          )}
        </div>

        {/* Personalisation banner */}
        {currentUser && (
          <div className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
            <Badge className="border-0 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Personalized feed</Badge>
            {viewerSettings && (
              <Badge variant="secondary" className="bg-sky-50 text-sky-700 hover:bg-sky-50">
                Intent: {discoveryIntentLabels[viewerSettings]}
              </Badge>
            )}
            <p className="text-sm text-slate-500">
              The strongest articles rise when they match what you follow and the kind of growth you want right now.
            </p>
          </div>
        )}

        {/* Empty state */}
        {feedArticles.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 py-24 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
              <BookOpen className="h-8 w-8 text-indigo-300" />
            </div>
            <p className="font-semibold text-slate-600">No articles yet</p>
            <p className="mt-1 text-sm text-slate-400">Be the first expert to share your knowledge.</p>
            {userId && (
              <Button className="mt-6 bg-indigo-600 hover:bg-indigo-700" asChild>
                <Link href="/dashboard/articles/new">Write the First Article</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {feedArticles.map((article) => {
              const eligibility = article.authorId ? directMessageEligibility.get(article.authorId) : undefined;
              const totalArticleReactions = article.fireCount + article.lightbulbCount + article.heartCount;
              const wordCount = article.content.trim().split(/\s+/).length;
              const readTime = Math.max(1, Math.ceil(wordCount / 200));

              return (
                <article
                  key={article.id}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                >
                  {/* Entire card is a link */}
                  <Link href={`/article/${article.slug}`} className="absolute inset-0 z-10" aria-label={article.title} />

                  {/* Cover image */}
                  {article.coverImageUrl ? (
                    <div className="relative h-44 w-full shrink-0 overflow-hidden">
                      <Image
                        src={article.coverImageUrl}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                  ) : (
                    /* Placeholder gradient when no cover */
                    <div className="h-2 w-full shrink-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />
                  )}

                  <div className="flex flex-1 flex-col p-5">
                    {/* Badges */}
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {article.topicName && (
                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
                          {article.topicName}
                        </span>
                      )}
                      {article.matchReasons.slice(0, 1).map((reason) => (
                        <span key={reason} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                          {reason}
                        </span>
                      ))}
                    </div>

                    {/* Title */}
                    <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-indigo-600">
                      {article.title}
                    </h3>

                    {/* Excerpt */}
                    <p className="mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-500">
                      {article.content}
                    </p>

                    {/* Author row — links to profile */}
                    <div className="flex items-center gap-2.5">
                      <a href={article.authorId ? `/profile/${article.authorId}` : undefined} className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-[10px] font-bold text-white hover:opacity-80 transition-opacity">
                        {article.authorAvatar ? (
                          <Image
                            src={article.authorAvatar}
                            alt={article.authorName ?? ""}
                            width={28}
                            height={28}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          article.authorName?.charAt(0).toUpperCase() ?? "A"
                        )}
                      </a>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <a href={article.authorId ? `/profile/${article.authorId}` : undefined} className="truncate text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors">
                            {article.authorName ?? "Unknown"}
                          </a>
                          {article.authorRole === "expert" && (
                            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {readTime}m
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="my-3.5 h-px bg-slate-100" />

                    {/* Reactions + comment count + date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {[
                          { emoji: "🔥", count: article.fireCount },
                          { emoji: "💡", count: article.lightbulbCount },
                          { emoji: "❤️", count: article.heartCount },
                        ].map(({ emoji, count }) =>
                          count > 0 ? (
                            <span key={emoji} className="flex items-center gap-1 text-xs text-slate-500">
                              <span className="text-sm">{emoji}</span> {count}
                            </span>
                          ) : null
                        )}
                        {totalArticleReactions === 0 && (
                          <span className="text-xs text-slate-300">No reactions yet</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <MessageSquare className="h-3 w-3" />
                        {article.commentCount}
                      </div>
                    </div>

                    {/* Message author — raised above the card link via z-index */}
                    {currentUser && article.authorId && article.authorId !== currentUser.id && (
                      <div className="relative z-20 mt-3">
                        <StartConversationButton
                          targetUserId={article.authorId}
                          disabled={eligibility?.allowed === false}
                          disabledReason={eligibility?.reason}
                          label="Message author"
                          size="sm"
                          variant="outline"
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── FOOTER ── */}
      <footer className="mt-8 border-t bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8">
          <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-sm font-bold text-transparent">
            SkillPulse
          </span>
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} SkillPulse. Learn together, grow together.</p>
        </div>
      </footer>
    </main>
  );
}
