"use server";

import { createOrGetDirectConversation } from "@/lib/messaging";
import { getCurrentUser } from "@/lib/currentUser";
import type { StartConversationActionState } from "./messages-types";

export async function startDirectConversation(
  targetUserId: string,
  _prevState: StartConversationActionState,
  _formData: FormData
): Promise<StartConversationActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false,
      conversationId: null,
      message: "You need to sign in before starting a conversation.",
    };
  }

  const result = await createOrGetDirectConversation(user.id, targetUserId);

  return {
    success: result.success,
    conversationId: result.conversationId ?? null,
    message: result.message ?? "",
  };
}
