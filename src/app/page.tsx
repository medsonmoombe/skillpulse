import { SignUpButton, SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { db } from "@/db";
import { articles, users, topics } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { BookOpen, Zap, Users, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();

  const feedArticles = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      content: articles.content,
      createdAt: articles.createdAt,
      authorName: users.displayName,
      authorAvatar: users.avatarUrl,
      topicName: topics.name,
    })
    .from(articles)
    .leftJoin(users, eq(articles.authorId, users.id))
    .leftJoin(topics, eq(articles.topicId, topics.id))
    .where(eq(articles.published, true))
    .orderBy(desc(articles.createdAt))
    .limit(12);

  return (
    <main className="min-h-screen bg-slate-50">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm h-16 flex items-center justify-between px-6 max-w-7xl mx-auto">
        <Link href="/" className="text-xl font-extrabold bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text">
          SkillPulse
        </Link>
        <div className="flex items-center gap-3">
          {userId ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard" className="gap-2">
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
      </nav>

      {/* HERO */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <Badge className="mb-6 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-50">
            <Zap className="h-3 w-3 mr-1" /> Live learning platform
          </Badge>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-5">
            Learn by <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text">Doing</span>.
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10">
            Join live audio rooms, read expert insights, and master skills through real-time practice with a community that ships.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {!userId ? (
              <>
                <SignUpButton mode="modal">
                  <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 gap-2 px-8">
                    Start Learning Free <ArrowRight className="h-4 w-4" />
                  </Button>
                </SignUpButton>
                <Button size="lg" variant="outline" asChild>
                  <a href="#feed">Browse Articles</a>
                </Button>
              </>
            ) : (
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 gap-2 px-8" asChild>
                <Link href="/dashboard">Go to Dashboard <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            )}
          </div>

          {/* STATS ROW */}
          <div className="flex items-center justify-center gap-8 mt-14 pt-10 border-t flex-wrap">
            {[
              { icon: BookOpen, label: "Expert Articles", value: `${feedArticles.length}+` },
              { icon: Users, label: "Live Rooms", value: "Always On" },
              { icon: Zap, label: "Real-time Chat", value: "Instant" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 text-left">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ARTICLES FEED */}
      <div id="feed" className="max-w-7xl mx-auto px-4 md:px-6 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Latest Insights</h2>
            <p className="text-slate-500 text-sm mt-1">Expert-written articles to level up your skills</p>
          </div>
          {userId && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/articles/new" className="gap-2">
                <BookOpen className="h-4 w-4" /> Write Article
              </Link>
            </Button>
          )}
        </div>

        {feedArticles.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl">
            <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">No articles yet</p>
            <p className="text-sm text-slate-400 mt-1">Be the first expert to share your knowledge.</p>
            {userId && (
              <Button className="mt-6 bg-indigo-600 hover:bg-indigo-700" asChild>
                <Link href="/dashboard/articles/new">Write the First Article</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {feedArticles.map((article) => (
              <Card key={article.id} className="flex flex-col hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border-slate-200">
                <CardHeader className="pb-3">
                  {article.topicName && (
                    <Badge variant="secondary" className="w-fit mb-2 bg-indigo-50 text-indigo-700 border-0 text-xs">
                      {article.topicName}
                    </Badge>
                  )}
                  <Link href={`/article/${article.slug}`} className="group">
                    <h3 className="text-base font-bold line-clamp-2 text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                      {article.title}
                    </h3>
                  </Link>
                </CardHeader>
                <CardContent className="flex-1 pt-0">
                  <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">{article.content}</p>
                </CardContent>
                <CardFooter className="border-t pt-4 mt-auto">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      {article.authorAvatar ? (
                        <img src={article.authorAvatar} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-white" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 ring-2 ring-white">
                          {article.authorName?.charAt(0) || "A"}
                        </div>
                      )}
                      <span className="text-xs font-medium text-slate-700 truncate max-w-[100px]">
                        {article.authorName || "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {new Date(article.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="border-t bg-white mt-8">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between flex-wrap gap-4">
          <span className="text-sm font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text">SkillPulse</span>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} SkillPulse. Built for learners.</p>
        </div>
      </footer>

    </main>
  );
}
