import { db } from "@/db";
import { articles } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { eq, and } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { ArticleEditForm } from "@/components/ArticleEditForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [article] = await db
    .select()
    .from(articles)
    .where(and(eq(articles.id, id), eq(articles.authorId, user.id)));

  if (!article) notFound();

  return <ArticleEditForm article={article} />;
}
