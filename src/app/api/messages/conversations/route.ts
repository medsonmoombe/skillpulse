import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { listUserConversations } from "@/lib/messaging";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json([], { status: 401 });
  }

  const conversations = await listUserConversations(user.id);

  return NextResponse.json(
    conversations.map((conversation) => ({
      ...conversation,
      updatedAt: conversation.updatedAt.toISOString(),
    }))
  );
}
