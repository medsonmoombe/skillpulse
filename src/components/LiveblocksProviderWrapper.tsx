"use client";

import { LiveblocksProvider } from "@liveblocks/react";

async function resolveUsers({ userIds }: { userIds: string[] }) {
  const params = userIds.map((id) => `userIds=${encodeURIComponent(id)}`).join("&");
  const res = await fetch(`/api/liveblocks/users?${params}`);
  if (!res.ok) return userIds.map(() => ({ name: "Unknown" }));
  return res.json() as Promise<{ name: string; avatar?: string }[]>;
}

export function LiveblocksProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      resolveUsers={resolveUsers}
    >
      {children}
    </LiveblocksProvider>
  );
}
