import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { getUnreadConversationSummary } from "@/lib/messaging";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        unreadConversations: 0,
        unreadMessages: 0,
      },
      { status: 401 }
    );
  }

  let summary;
  try {
    summary = await getUnreadConversationSummary(user.id);
  } catch (err) {
    console.warn("[unread-summary] failed, returning zeros:", (err as Error)?.message);
    summary = { unreadConversations: 0, unreadMessages: 0 };
  }

  return NextResponse.json(summary);
}
