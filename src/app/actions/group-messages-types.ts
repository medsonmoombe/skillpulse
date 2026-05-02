export type OpenGroupConversationActionState = {
  success: boolean;
  conversationId: string | null;
  message: string;
};

export const initialOpenGroupConversationActionState: OpenGroupConversationActionState = {
  success: false,
  conversationId: null,
  message: "",
};
