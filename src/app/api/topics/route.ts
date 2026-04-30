import { db } from "@/db";
import { topics } from "@/db/schema";

export async function GET() {
  const allTopics = await db.select().from(topics);
  return Response.json(allTopics);
}