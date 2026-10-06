"use client";

import { LiveblocksProvider } from "@liveblocks/react";

async function resolveUsers({ userIds }: { userIds: string[] }) {
  const params = userIds.map((id) => `userIds=${encodeURIComponent(id)}`).join("&");
  const res = await fetch(`/api/liveblocks/users?${params}`);
  if (!res.ok) return userIds.map(() => ({ name: "Unknown" }));
  return res.json() as Promise<{ name: string; avatar?: string }[]>;
}

// Retry auth up to 4 times with exponential backoff
// Liveblocks times out fast — this gives Supabase time to wake up
async function authEndpoint(room?: string): Promise<{ token: string }> {
  const MAX_RETRIES = 4;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch("/api/liveblocks-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room }),
        signal: AbortSignal.timeout(15000), // 15s per attempt
      });

      if (res.ok) {
        return res.json();
      }

      // 401/403 — don't retry auth errors, only timeouts/500s
      if (res.status === 401 || res.status === 403) {
        throw new Error(`Auth denied: ${res.status}`);
      }

      lastError = new Error(`Auth failed with status ${res.status}`);
    } catch (err: any) {
      const isTimeout =
        err?.name === "TimeoutError" ||
        err?.name === "AbortError" ||
        err?.message?.includes("timeout") ||
        err?.message?.includes("Timed out");

      if (!isTimeout) throw err; // non-timeout errors bubble immediately

      lastError = err;
      console.warn(`[Liveblocks] Auth timeout on attempt ${attempt}/${MAX_RETRIES}, retrying...`);
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  throw lastError;
}

export function LiveblocksProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint={authEndpoint}
      resolveUsers={resolveUsers}
    >
      {children}
    </LiveblocksProvider>
  );
}
