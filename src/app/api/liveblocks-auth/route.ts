import { Liveblocks } from "@liveblocks/node";
import { getCurrentUser } from "@/lib/currentUser";
import { getAccessibleConversation } from "@/lib/messaging";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response(null, { status: 401 });
  }

  const { room } = await request.json();

  if (typeof room !== "string" || room.length === 0) {
    return new Response(null, { status: 400 });
  }

  // Attach real user info — this is what populates comment.userInfo.name
  // and comment.userInfo.avatar in every Liveblocks thread/comment
  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      name: user.displayName,
      avatar: user.avatarUrl ?? undefined,
    },
  });

  if (room.startsWith("conversation-")) {
    const conversationId = room.replace("conversation-", "");
    const accessible = await getAccessibleConversation(conversationId, user.id);

    if (!accessible) {
      return new Response(null, { status: 403 });
    }
  }

  // Allow access to the requested room
  session.allow(room, session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  return new Response(body, { status });
}
