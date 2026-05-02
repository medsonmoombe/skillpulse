"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast-provider";

type ActionToastState = {
  success?: boolean;
  message?: string | null;
};

export function useActionToast(state: ActionToastState | null | undefined) {
  const { showToast } = useToast();
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    const message = state?.message?.trim();
    if (!message || lastMessageRef.current === message) return;
    lastMessageRef.current = message;
    showToast(message, state?.success ? "success" : "error");
  }, [showToast, state?.message, state?.success]);
}
