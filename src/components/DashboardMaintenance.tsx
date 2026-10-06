"use client";

import { useEffect } from "react";

export function DashboardMaintenance() {
  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/dashboard/bootstrap", {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
    }).catch(() => {
      // Non-blocking background maintenance only.
    });

    return () => controller.abort();
  }, []);

  return null;
}
