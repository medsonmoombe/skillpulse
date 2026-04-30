"use client";

import { LiveblocksProvider } from "@liveblocks/react";

export function LiveblocksProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      {children}
    </LiveblocksProvider>
  );
}
