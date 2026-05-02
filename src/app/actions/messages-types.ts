export type StartConversationActionState = {
  success: boolean;
  conversationId: string | null;
  message: string;
};

export const initialStartConversationActionState: StartConversationActionState = {
  success: false,
  conversationId: null,
  message: "",
};
