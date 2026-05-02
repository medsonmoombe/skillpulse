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

  const summary = await getUnreadConversationSummary(user.id);

  return NextResponse.json(summary);
}
