import { db } from "@/db";
import { articles, users, groups } from "@/db/schema";
import { ilike, eq, or, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const pattern = `%${q}%`;

  const [articleRows, userRows, groupRows] = await Promise.all([
    db
      .select({ id: articles.id, title: articles.title, slug: articles.slug })
      .from(articles)
      .where(and(eq(articles.published, true), ilike(articles.title, pattern)))
      .limit(5),

    db
      .select({ id: users.id, displayName: users.displayName, role: users.role })
      .from(users)
      .where(ilike(users.displayName, pattern))
      .limit(5),

    db
      .select({ id: groups.id, name: groups.name, slug: groups.slug, description: groups.description })
      .from(groups)
      .where(or(ilike(groups.name, pattern), ilike(groups.description, pattern)))
      .limit(5),
  ]);

  const results = [
    ...articleRows.map((a) => ({
      id: a.id,
      type: "article" as const,
      title: a.title,
      subtitle: "Article",
      href: `/article/${a.slug}`,
    })),
    ...userRows.map((u) => ({
      id: u.id,
      type: "person" as const,
      title: u.displayName,
      subtitle: u.role === "expert" ? "Expert" : "Learner",
      href: `/profile/${u.id}`,
    })),
    ...groupRows.map((g) => ({
      id: g.id,
      type: "group" as const,
      title: g.name,
      subtitle: g.description?.slice(0, 60) ?? "Group",
      href: `/dashboard/groups/${g.slug}`,
    })),
  ];

  return NextResponse.json(results);
}
