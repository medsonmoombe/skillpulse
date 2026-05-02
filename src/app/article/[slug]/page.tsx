import { db } from "@/db";
import { articles, users, topics, articleInteractions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StartConversationButton } from "@/components/StartConversationButton";
import { ArticleInteractions } from "@/components/ArticleInteractions";
import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/currentUser";
import { getDirectMessageEligibility } from "@/lib/messaging";
import { Clock, BookOpen, ArrowLeft, BadgeCheck, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const [article] = await db
    .select({
      id: articles.id,
      title: articles.title,
      content: articles.content,
      coverImageUrl: articles.coverImageUrl,
      createdAt: articles.createdAt,
      viewsCount: articles.viewsCount,
      authorId: users.id,
      authorName: users.displayName,
      authorAvatar: users.avatarUrl,
      authorBio: users.bio,
      authorRole: users.role,
      topicName: topics.name,
      topicSlug: topics.slug,
    })
    .from(articles)
    .leftJoin(users, eq(articles.authorId, users.id))
    .leftJoin(topics, eq(articles.topicId, topics.id))
    .where(eq(articles.slug, slug));

  if (!article) notFound();

  // Fetch all interactions for this article
  const allInteractions = await db
    .select({
      id: articleInteractions.id,
      type: articleInteractions.type,
      userId: articleInteractions.userId,
      content: articleInteractions.content,
      createdAt: articleInteractions.createdAt,
      authorName: users.displayName,
      authorAvatar: users.avatarUrl,
    })
    .from(articleInteractions)
    .leftJoin(users, eq(articleInteractions.userId, users.id))
    .where(eq(articleInteractions.articleId, article.id));

  // Tally reaction counts
  const counts = { fire: 0, lightbulb: 0, heart: 0 } as Record<"fire" | "lightbulb" | "heart", number>;
  const userReactions = { fire: false, lightbulb: false, heart: false } as Record<"fire" | "lightbulb" | "heart", boolean>;

  const comments = [];

  for (const interaction of allInteractions) {
    if (interaction.type === "comment") {
      comments.push({
        id: interaction.id,
        content: interaction.content ?? "",
        authorName: interaction.authorName ?? "Unknown",
        authorAvatar: interaction.authorAvatar ?? null,
        createdAt: interaction.createdAt,
      });
    } else if (interaction.type in counts) {
      counts[interaction.type as "fire" | "lightbulb" | "heart"]++;
      if (user && interaction.userId === user.id) {
        userReactions[interaction.type as "fire" | "lightbulb" | "heart"] = true;
      }
    }
  }

  const canMessageAuthor =
    user && article.authorId && user.id !== article.authorId
      ? await getDirectMessageEligibility(user.id, article.authorId)
      : null;

  const wordCount = article.content.trim().split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-lg font-extrabold text-transparent"
            >
              SkillPulse
            </Link>
          </div>
          {user && (
            <Link href="/dashboard">
              <Button variant="outline" size="sm">Dashboard</Button>
            </Link>
          )}
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">

          {/* ── MAIN COLUMN ── */}
          <div className="min-w-0">

            {/* Cover image */}
            {article.coverImageUrl && (
              <div className="relative mb-8 h-64 w-full overflow-hidden rounded-3xl shadow-lg md:h-80">
                <Image
                  src={article.coverImageUrl}
                  alt={article.title}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            )}

            {/* Article header */}
            <header className="mb-8">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {article.topicName && (
                  <Badge className="border-0 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                    {article.topicName}
                  </Badge>
                )}
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  {readTime} min read
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <BookOpen className="h-3.5 w-3.5" />
                  {wordCount} words
                </div>
              </div>

              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-4xl">
                {article.title}
              </h1>

              {/* Author row */}
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 text-sm font-bold text-white shadow-sm">
                  {article.authorAvatar ? (
                    <Image
                      src={article.authorAvatar}
                      alt={article.authorName ?? ""}
                      width={44}
                      height={44}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    article.authorName?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {article.authorId ? (
                      <Link
                        href={`/profile/${article.authorId}`}
                        className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                      >
                        {article.authorName}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-slate-900">{article.authorName}</span>
                    )}
                    {article.authorRole === "expert" && (
                      <BadgeCheck className="h-4 w-4 text-indigo-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="h-3 w-3" />
                    {new Date(article.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            </header>

            {/* Divider */}
            <div className="mb-8 h-px bg-gradient-to-r from-indigo-100 via-purple-100 to-transparent" />

            {/* Article body */}
            <div className="prose prose-slate prose-base max-w-none leading-8 text-slate-700 whitespace-pre-line
              prose-headings:font-bold prose-headings:text-slate-900
              prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-slate-900 prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:rounded">
              {article.content}
            </div>

            {/* Interactions */}
            <ArticleInteractions
              articleId={article.id}
              slug={slug}
              isLoggedIn={!!user}
              initialCounts={counts}
              initialUserReactions={userReactions}
              comments={comments}
            />
          </div>

          {/* ── SIDEBAR ── */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">

            {/* Author card */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {/* Gradient banner */}
              <div className="h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400" />
              <div className="px-5 pb-5">
                <div className="-mt-7 mb-3 flex items-end justify-between">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-gradient-to-br from-indigo-400 to-purple-500 text-base font-bold text-white shadow-md">
                    {article.authorAvatar ? (
                      <Image
                        src={article.authorAvatar}
                        alt={article.authorName ?? ""}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      article.authorName?.charAt(0).toUpperCase()
                    )}
                  </div>
                  {article.authorRole === "expert" && (
                    <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                      <BadgeCheck className="h-3 w-3" /> Expert
                    </span>
                  )}
                </div>

                {article.authorId ? (
                  <Link
                    href={`/profile/${article.authorId}`}
                    className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                  >
                    {article.authorName}
                  </Link>
                ) : (
                  <p className="text-sm font-bold text-slate-900">{article.authorName}</p>
                )}

                {article.authorBio && (
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500 line-clamp-3">
                    {article.authorBio}
                  </p>
                )}

                <div className="mt-4 space-y-2">
                  {article.authorId && (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link href={`/profile/${article.authorId}`}>View profile</Link>
                    </Button>
                  )}
                  {canMessageAuthor && (
                    <StartConversationButton
                      targetUserId={article.authorId!}
                      disabled={canMessageAuthor.allowed === false}
                      disabledReason={canMessageAuthor.reason}
                      label="Message author"
                      size="sm"
                      className="w-full"
                    />
                  )}
                  {article.authorRole === "expert" && (
                    <Button size="sm" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 hover:opacity-90">
                      Book a Live Session
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Article stats */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Article Stats</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Views", value: article.viewsCount ?? 0 },
                  { label: "Reactions", value: counts.fire + counts.lightbulb + counts.heart },
                  { label: "Comments", value: comments.length },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-slate-50 py-2.5">
                    <p className="text-base font-bold text-slate-900">{value}</p>
                    <p className="text-[10px] text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Topic pill */}
            {article.topicName && (
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Topic</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">
                  <BookOpen className="h-3 w-3" />
                  {article.topicName}
                </span>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
