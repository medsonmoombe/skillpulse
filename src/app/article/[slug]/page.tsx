import { db } from "@/db";
import { articles, users, topics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

// This tells Next.js to pre-render the page at request time, good for dynamic DB data
export const dynamic = "force-dynamic";

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const { userId } = await auth();

  // Fetch the specific article
  const [article] = await db
    .select({
      id: articles.id,
      title: articles.title,
      content: articles.content,
      createdAt: articles.createdAt,
      authorId: users.id,
      authorName: users.displayName,
      authorAvatar: users.avatarUrl,
      authorRole: users.role,
      topicName: topics.name,
    })
    .from(articles)
    .leftJoin(users, eq(articles.authorId, users.id))
    .leftJoin(topics, eq(articles.topicId, topics.id))
    .where(eq(articles.slug, slug));

  // If article doesn't exist or isn't published, show 404
  if (!article) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b h-16 flex items-center justify-between px-6 max-w-7xl mx-auto">
        <Link href="/" className="text-xl font-extrabold bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text">
          SkillPulse
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">Dashboard</Button>
          </Link>
        </div>
      </nav>

      {/* Article Content */}
      <article className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-8 border-b pb-8">
          {article.topicName && (
            <Badge variant="secondary" className="mb-4 bg-indigo-50 text-indigo-700">
              {article.topicName}
            </Badge>
          )}
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-6">
            {article.title}
          </h1>
          
          {/* Author Info & CTA */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={article.authorAvatar || ""} />
                <AvatarFallback className="bg-indigo-100 text-indigo-600">
                  {article.authorName?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-slate-900">{article.authorName || "Unknown"}</p>
                <p className="text-sm text-slate-500">
                  {article.authorRole === "expert" ? "Verified Expert" : "Community Member"} • {new Date(article.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            {article.authorRole === "expert" && (
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                Book a Live Session
              </Button>
            )}
          </div>
        </header>

        {/* Body - Using whitespace-pre-line to respect line breaks in plain text */}
        <div className="prose prose-slate prose-lg max-w-none text-slate-800 whitespace-pre-line">
          {article.content}
        </div>

        {/* Interactions Placeholder (We build this next) */}
        <div className="mt-12 pt-8 border-t">
          <h3 className="text-xl font-bold mb-4">Reactions & Comments</h3>
          {userId ? (
            <p className="text-slate-500 text-sm">Interactive reactions loading soon...</p>
          ) : (
            <p className="text-slate-500 text-sm">
              <Link href="/dashboard" className="text-indigo-600 hover:underline">Sign in</Link> to leave a reaction or comment.
            </p>
          )}
        </div>
      </article>
    </main>
  );
}