import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in the environment variables.");
}

// Singleton pattern — prevents new connection pools on every hot reload in dev
const globalForDb = globalThis as unknown as { client: postgres.Sql };

const client = globalForDb.client ?? postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 5,
  idle_timeout: 20,
  connect_timeout: 30,
  max_lifetime: 1800,
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });
