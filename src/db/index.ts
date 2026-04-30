import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in the environment variables.");
}

// Singleton pattern — prevents new connection pools on every hot reload in dev
const globalForDb = globalThis as unknown as { client: postgres.Sql };

const client = globalForDb.client ?? postgres(process.env.DATABASE_URL, {
  prepare: false,   // required for supabase connection pooler
  max: 5,           // limit pool size to stay under Supabase's 15 session limit
  idle_timeout: 20, // close idle connections after 20s
  connect_timeout: 30,
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });
