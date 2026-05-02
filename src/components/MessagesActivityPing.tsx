"use client";

import { useEffect } from "react";

export function MessagesActivityPing() {
  useEffect(() => {
    window.dispatchEvent(new Event("skillpulse:messages-updated"));
  }, []);

  return null;
}
