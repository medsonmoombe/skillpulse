"use server";

import { createOrGetGroupConversation } from "@/lib/messaging";
import { getCurrentUser } from "@/lib/currentUser";
import type { OpenGroupConversationActionState } from "./group-messages-types";

export async function openGroupConversation(
  groupId: string,
  _prevState: OpenGroupConversationActionState,
  _formData: FormData
): Promise<OpenGroupConversationActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false,
      conversationId: null,
      message: "You need to sign in before opening the group chat.",
    };
  }

  const result = await createOrGetGroupConversation(user.id, groupId);

  return {
    success: result.success,
    conversationId: result.conversationId,
    message: result.message ?? "",
  };
}
