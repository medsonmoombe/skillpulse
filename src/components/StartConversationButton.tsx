"use client";

import type { ComponentProps } from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { initialStartConversationActionState } from "@/app/actions/messages-types";
import { startDirectConversation } from "@/app/actions/messages";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/lib/use-action-toast";

type StartConversationButtonProps = {
  targetUserId: string;
  disabled?: boolean;
  disabledReason?: string | null;
  label?: string;
  className?: string;
} & Pick<ComponentProps<typeof Button>, "size" | "variant">;

export function StartConversationButton({
  targetUserId,
  disabled = false,
  disabledReason = null,
  label = "Message",
  className,
  size = "default",
  variant = "default",
}: StartConversationButtonProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    startDirectConversation.bind(null, targetUserId),
    initialStartConversationActionState
  );
  useActionToast(state);

  useEffect(() => {
    if (state.success && state.conversationId) {
      router.push(`/dashboard/messages/${state.conversationId}`);
      router.refresh();
    }
  }, [router, state.conversationId, state.success]);

  if (disabled) {
    return (
      <div className="space-y-2">
        <Button type="button" disabled className={className} size={size} variant={variant}>
          <MessageSquare className="h-4 w-4" />
          {label}
        </Button>
        {disabledReason ? <p className="text-xs text-slate-500">{disabledReason}</p> : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <Button type="submit" disabled={isPending} className={className} size={size} variant={variant}>
        <MessageSquare className="h-4 w-4" />
        {isPending ? "Opening chat..." : label}
      </Button>
      {state.message ? (
        <p className={`text-xs ${state.success ? "text-emerald-600" : "text-rose-600"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
