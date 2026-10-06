import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, BookOpen, Clock, MessageSquare, BadgeCheck, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { StartConversationButton } from "@/components/StartConversationButton";
import { Navbar } from "@/components/Navbar";
import { getCurrentUser } from "@/lib/currentUser";
import { getFeedArticlesForUser } from "@/lib/feed";
import { db } from "@/db";
import { conversations, expertReviews, userSettings, users } from "@/db/schema";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import homepageData from "@/data/homepage.json";
import { appName } from "@/data/constant";

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export default async function Home() {
  const { userId } = await auth();

  // Resolve the internal DB user first — feed scoring needs the DB UUID, not the Clerk ID.
  const currentUserPromise = userId ? getCurrentUser() : Promise.resolve(null);
  const [currentUser, learnerCount, averageRating] = await Promise.all([
    withTimeout(currentUserPromise, 3000, null),
    withTimeout(
      db
        .select({ learnerCount: sql<number>`cast(count(*) as int)` })
        .from(users)
        .where(and(eq(users.role, "learner"), eq(users.isSuspended, false)))
        .then(([row]) => row?.learnerCount ?? 0),
      3000,
      0
    ),
    withTimeout(
      db
        .select({ averageRating: sql<number | null>`round(avg(${expertReviews.rating})::numeric, 1)` })
        .from(expertReviews)
        .then(([row]) => row?.averageRating ?? null),
      3000,
      null
    ),
  ]);

  const feedArticles = await withTimeout(getFeedArticlesForUser(currentUser?.id ?? null, 12), 4000, []);
  const activeLearnersLabel = learnerCount.toLocaleString("en-US");
  const averageRatingLabel = `${Number(averageRating ?? 0).toFixed(1)}/5`;

  // ── Batch DM eligibility — 2 queries for all authors, not N ───────────────────────
  // We need to know: (a) does a conversation already exist? (b) has the author
  // blocked DMs? Both can be answered with one query each instead of N calls.
  const directMessageEligibility = new Map<string, { allowed: boolean; reason: string | null }>();

  if (currentUser) {
    const authorIds = Array.from(
      new Set(
        feedArticles
          .map((a) => a.authorId)
          .filter((id): id is string => Boolean(id) && id !== currentUser.id)
      )
    );

    if (authorIds.length > 0) {
      const dmResults = await withTimeout(
        Promise.all([
          db
            .select({ participantA: conversations.participantA, participantB: conversations.participantB })
            .from(conversations)
            .where(and(
              eq(conversations.type, "direct"),
              or(
                and(eq(conversations.participantA, currentUser.id), inArray(conversations.participantB, authorIds)),
                and(eq(conversations.participantB, currentUser.id), inArray(conversations.participantA, authorIds)),
              )
            )),
          db
            .select({ userId: userSettings.userId, allowDirectMessages: userSettings.allowDirectMessages, directMessagePrivacy: userSettings.directMessagePrivacy })
            .from(userSettings)
            .where(inArray(userSettings.userId, authorIds)),
        ]),
        5000,
        [[], []] as [{ participantA: string | null; participantB: string | null }[], { userId: string; allowDirectMessages: boolean | null; directMessagePrivacy: string | null }[]]
      );
      const [existingConvos, authorSettings] = dmResults;

      const existingPartners = new Set(
        existingConvos
          .map((c) => c.participantA === currentUser.id ? c.participantB : c.participantA)
          .filter((id): id is string => Boolean(id))
      );
      const settingsMap = new Map(authorSettings.map((s) => [s.userId, s]));

      for (const authorId of authorIds) {
        if (existingPartners.has(authorId)) {
          directMessageEligibility.set(authorId, { allowed: true, reason: null });
          continue;
        }
        const s = settingsMap.get(authorId);
        if (s?.allowDirectMessages === false || s?.directMessagePrivacy === "nobody") {
          directMessageEligibility.set(authorId, { allowed: false, reason: "This author is not accepting messages right now." });
        } else {
          directMessageEligibility.set(authorId, { allowed: true, reason: null });
        }
      }
    }
  }

  // get app name from .env 
 

  return (
    <>
      <Navbar userId={userId} />

      {/* HERO SECTION */}
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden px-6 pt-20">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl animate-morph" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-gradient-to-br from-purple-500/30 to-indigo-500/30 rounded-full blur-3xl animate-morph" style={{ animationDelay: '-7s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full blur-3xl animate-pulse-glow" />

        <div className="max-w-6xl mx-auto text-center relative z-10">

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-none tracking-tight mb-8 text-foreground">
            Grow Faster.<br />
            <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">Together.</span>
          </h1>

          <p className="text-lg md:text-xl font-light text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            {appName} connects ambitious learners with world-class experts through AI-powered matching, real-time collaboration, and a community that accelerates your growth.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            {!userId ? (
              <>
                <SignUpButton mode="modal">
                  <button className="cta-btn group px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium text-sm hover:opacity-90 transition-all duration-300 flex items-center gap-3">
                    <span className="flex items-center gap-3">Start Learning Free<ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" /></span>
                  </button>
                </SignUpButton>
                <a href="#how-it-works" className="group px-8 py-4 rounded-2xl border border-border text-muted-foreground font-medium text-sm hover:border-indigo-500 hover:text-foreground transition-all duration-300 flex items-center gap-3">
                  See How It Works
                </a>
              </>
            ) : (
              <Link href="/dashboard" className="cta-btn group px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium text-sm hover:opacity-90 transition-all duration-300 flex items-center gap-3">
                Go to Dashboard
                <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
              </Link>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {['user1', 'user2', 'user3', 'user4'].map(s => (
                  <img key={s} src={`https://picsum.photos/seed/${s}/32/32.jpg`} className="w-8 h-8 rounded-full border-2 border-border" alt="user" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">{activeLearnersLabel}</span> active learners
              </span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => <span key={i} className="text-amber-500 text-sm">★</span>)}
              </div>
              <span className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">{averageRatingLabel}</span> avg rating
              </span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float" style={{ animationDuration: '3s' }}>
          <span className="text-xs text-muted-foreground uppercase tracking-[0.2em]">Scroll</span>
          <div className="w-5 h-8 rounded-full border border-border flex items-start justify-center p-1">
            <div className="w-1 h-2 rounded-full bg-muted-foreground animate-bounce" />
          </div>
        </div>
      </section>

      {/* LOGO MARQUEE */}
      <section className="py-16 border-y border-border relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-8">
          <p className="text-center text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">Trusted by teams at</p>
        </div>
        <div className="relative overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap">
            <div className="flex items-center gap-16 mx-8">
              {homepageData.companies.map((company) => (
                <span key={company} className="text-2xl font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-default">
                  {company}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-16 mx-8">
              {homepageData.companies.map((company) => (
                <span key={`${company}-2`} className="text-2xl font-semibold text-muted-foreground">
                  {company}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="py-32 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {homepageData.stats.map((stat, i) => (
              <div key={i} className="stat-card glass rounded-3xl p-8 text-center">
                <div className="text-4xl md:text-5xl font-bold leading-none bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent mb-3">{stat.value}</div>
                <div className="text-sm text-foreground font-medium">{stat.label}</div>
                <div className="text-xs text-muted-foreground mt-2">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-32 px-6 relative">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl" />
        
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-indigo-500 mb-4 block">Features</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-foreground">
              Everything you need to <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">level up</span>
            </h2>
            <p className="text-lg font-light text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              A complete ecosystem designed to accelerate your learning journey from day one.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {homepageData.features.map((feature, i) => (
              <div key={i} className="glass rounded-3xl p-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/10 flex items-center justify-center mb-6">
                  <span className="text-2xl text-indigo-500">⚡</span>
                </div>
                <h3 className="text-xl font-semibold tracking-tight mb-3 text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-32 px-6 relative">
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-br from-indigo-500/8 to-transparent rounded-full blur-3xl" />

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-indigo-500 mb-4 block">Process</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-foreground">
              How <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">{appName}</span> Works
            </h2>
            <p className="text-lg font-light text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Three paths, one destination: unstoppable growth.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {homepageData.howItWorks.map((path, i) => (
              <div key={i}>
                <div className={`glass rounded-3xl p-8 h-full relative overflow-hidden ${path.popular ? 'border-indigo-500/20' : ''}`}>
                  <div className="text-7xl font-bold text-muted/30 absolute top-4 right-6 select-none">{path.number}</div>
                  
                  {path.popular && (
                    <div className="absolute top-4 left-4">
                      <span className="text-xs font-medium px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">Most Popular</span>
                    </div>
                  )}

                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-600/20 flex items-center justify-center mb-8">
                    <span className="text-3xl text-indigo-400">⚡</span>
                  </div>

                  <h3 className="text-2xl font-semibold tracking-tight mb-4 text-foreground">{path.title}</h3>

                  <div className="space-y-4">
                    {path.steps.map((step, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs text-indigo-500">✓</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{step}</p>
                      </div>
                    ))}
                  </div>

                  <button className={`mt-8 w-full py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    path.buttonStyle === 'solid'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 cta-btn'
                      : 'border border-border text-muted-foreground hover:border-indigo-500/50 hover:text-indigo-500'
                  }`}>
                    {path.buttonText}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="py-32 px-6 relative">
        <div className="absolute top-1/2 right-0 w-72 h-72 bg-gradient-to-br from-indigo-500/8 to-transparent rounded-full blur-3xl" />

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-indigo-500 mb-4 block">Testimonials</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-foreground">
              Loved by <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">learners</span>
            </h2>
            <p className="text-lg font-light text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Don't take our word for it—hear from people who've transformed their skills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {homepageData.testimonials.map((testimonial, i) => (
              <div key={i} className="glass rounded-3xl p-8 relative">
                <div className="flex gap-1 mb-6">
                  {Array.from({ length: Math.floor(testimonial.rating) }).map((_, j) => (
                    <span key={j} className="text-amber-500 text-sm">★</span>
                  ))}
                  {testimonial.rating % 1 !== 0 && <span className="text-amber-500 text-sm">★</span>}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-8">{testimonial.text.replace("{appName}", appName)}</p>
                <div className="flex items-center gap-3">
                  <img src={testimonial.avatar} className="w-10 h-10 rounded-full" alt={testimonial.author} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEED SECTION */}
      <section id="insights" className="py-32 px-6 relative">
        <div className="max-w-6xl mx-auto">

          {/* Left-aligned header + view-all link */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-16">
            <div>
              <span className="text-xs font-medium uppercase tracking-[0.3em] text-indigo-500 mb-4 block">Insights</span>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                Latest <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">thinking</span>
              </h2>
            </div>
            <Link
              href={userId ? "/dashboard" : "#insights"}
              className="mt-4 md:mt-0 flex items-center gap-2 text-sm text-muted-foreground hover:text-indigo-500 transition-colors"
            >
              View all articles <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {feedArticles.length === 0 ? (
            <div className="glass rounded-3xl py-24 text-center">
              <p className="font-semibold text-foreground">No articles yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {feedArticles.slice(0, 6).map((article) => {
                const eligibility = article.authorId ? directMessageEligibility.get(article.authorId) : undefined;
                const wordCount = article.content.trim().split(/\s+/).length;
                const readTime = Math.max(1, Math.ceil(wordCount / 200));
                const date = new Date(article.createdAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                });

                return (
                  <article key={article.id} className="group">
                    <div className="glass rounded-3xl overflow-hidden hover-lift card-shine">

                      {/* Cover image — aspect-[4/3] matching reference */}
                      <div className="aspect-[4/3] relative overflow-hidden">
                        {article.coverImageUrl ? (
                          <Image
                            src={article.coverImageUrl}
                            alt={article.title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-900/40 to-purple-900/20 flex items-center justify-center">
                            <BookOpen className="h-10 w-10 text-indigo-400/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        {/* Topic badge overlaid on image */}
                        {article.topicName && (
                          <span className="absolute bottom-4 left-4 text-xs font-medium px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/20">
                            {article.topicName}
                          </span>
                        )}
                      </div>

                      {/* Card body */}
                      <div className="p-6">
                        {/* Date + read time above title */}
                        <div className="flex items-center gap-2 mb-3">
                          <p className="text-xs text-muted-foreground">{date}</p>
                          <span className="text-muted-foreground/40">·</span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />{readTime} min read
                          </div>
                        </div>

                        <Link href={`/article/${article.slug}`} className="block">
                          <h3 className="text-lg font-semibold leading-snug text-foreground mb-3 group-hover:text-indigo-400 transition-colors line-clamp-2">
                            {article.title}
                          </h3>
                        </Link>

                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                          {article.content}
                        </p>

                        {/* Author + reactions */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-bold text-white">
                              {article.authorAvatar ? (
                                <Image src={article.authorAvatar} alt={article.authorName ?? ""} width={28} height={28} className="h-full w-full object-cover" />
                              ) : (
                                article.authorName?.charAt(0).toUpperCase() ?? "A"
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-foreground/80">{article.authorName ?? "Unknown"}</span>
                              {article.authorRole === "expert" && <BadgeCheck className="h-3.5 w-3.5 text-indigo-500" />}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {article.fireCount > 0 && <span>🔥 {article.fireCount}</span>}
                            {article.commentCount > 0 && (
                              <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{article.commentCount}</span>
                            )}
                          </div>
                        </div>

                        {currentUser && article.authorId && article.authorId !== currentUser.id && (
                          <div className="mt-4">
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
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>


      {/* FOOTER */}
      <footer className="border-t border-border py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
            {/* Brand */}
            <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Zap className="text-white w-5 h-5" />
                </div>
                <span className="text-lg font-semibold tracking-tight text-foreground">
                  Skill<span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">Pulse</span>
                </span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Connect. Learn. Grow. The platform where ambition meets expertise.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-3">
                <li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Integrations</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Changelog</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Press</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Resources</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Community</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">API Docs</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Status</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cookies</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Licenses</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} {appName}. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"></path><circle cx="4" cy="4" r="2"></circle></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"></path></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23 12a11 11 0 11-22 0 11 11 0 0122 0zm-9.5 6.5v-13l6 6.5-6 6.5z"></path></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
