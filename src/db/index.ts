import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in the environment variables.");
}

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as unknown as {
  client?: postgres.Sql;
  databaseUrl?: string;
};

const globalForDbDiagnostics = globalThis as unknown as {
  __dbConfigLogged?: boolean;
};

const globalForKeepalive = globalThis as unknown as {
  _dbKeepalive?: ReturnType<typeof setInterval>;
};

function getDbHost(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "invalid-database-url";
  }
}

function requiresSsl(url: string) {
  try {
    const parsed = new URL(url);
    const sslMode = parsed.searchParams.get("sslmode");
    return sslMode === "require" || parsed.hostname.includes("render.com");
  } catch {
    return false;
  }
}

function createClient(url: string) {
  return postgres(url, {
    prepare: false,
    max: 5,
    idle_timeout: 30,
    connect_timeout: 10,
    max_lifetime: 1800,
    ssl: requiresSsl(url) ? "require" : false,
    onnotice: () => {},
  });
}

if (!globalForDbDiagnostics.__dbConfigLogged) {
  globalForDbDiagnostics.__dbConfigLogged = true;
}

const client =
  globalForDb.client && globalForDb.databaseUrl === databaseUrl
    ? globalForDb.client
    : createClient(databaseUrl);

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
  globalForDb.databaseUrl = databaseUrl;
}

export const db = drizzle(client, { schema });

async function pingDb() {
  try {
    await client`select 1`;
  } catch {
    // Ignore keepalive failures. Real queries will retry with better diagnostics.
  }
}

void pingDb();

if (!globalForKeepalive._dbKeepalive) {
  globalForKeepalive._dbKeepalive = setInterval(pingDb, 4 * 60 * 1000);

  if (typeof globalForKeepalive._dbKeepalive.unref === "function") {
    globalForKeepalive._dbKeepalive.unref();
  }
}

function isTransientDbError(error: unknown) {
  const err = error as {
    code?: string;
    cause?: { code?: string; message?: string };
    message?: string;
  };

  const code = err?.code ?? err?.cause?.code ?? null;
  const message = String(err?.message ?? err?.cause?.message ?? "");

  return (
    code === "CONNECT_TIMEOUT" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "EPIPE" ||
    code === "57P01" ||
    code === "ECONNREFUSED" ||
    code === "ENETUNREACH" ||
    message.includes("Connection terminated") ||
    message.includes("fetch failed") ||
    message.includes("write ECONNRESET") ||
    message.includes("read ECONNRESET") ||
    message.includes("terminating connection") ||
    message.includes("timeout") ||
    message.includes("Failed query:")
  );
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 300
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (isTransientDbError(error) && attempt < retries) {
        const err = error as { code?: string; cause?: { code?: string }; message?: string };
        console.warn(`[DB] Transient error on attempt ${attempt}/${retries}, retrying...`, {
          code: err?.code ?? err?.cause?.code ?? null,
          message: err?.message ?? "Unknown database error",
        });
        await pingDb();
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("All DB retry attempts failed");
}
