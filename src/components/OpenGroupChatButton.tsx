"use client";

import type { ComponentProps } from "react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { openGroupConversation } from "@/app/actions/group-messages";
import { initialOpenGroupConversationActionState } from "@/app/actions/group-messages-types";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/lib/use-action-toast";

type OpenGroupChatButtonProps = {
  groupId: string;
  label?: string;
  className?: string;
} & Pick<ComponentProps<typeof Button>, "size" | "variant">;

export function OpenGroupChatButton({
  groupId,
  label = "Open group chat",
  className,
  size = "default",
  variant = "default",
}: OpenGroupChatButtonProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    openGroupConversation.bind(null, groupId),
    initialOpenGroupConversationActionState
  );
  useActionToast(state);

  useEffect(() => {
    if (state.success && state.conversationId) {
      router.push(`/dashboard/messages/${state.conversationId}`);
      router.refresh();
    }
  }, [router, state.conversationId, state.success]);

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
