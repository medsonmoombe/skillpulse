import { Liveblocks } from "@liveblocks/node";
import { getCurrentUser } from "@/lib/currentUser";
import { getAccessibleConversation } from "@/lib/messaging";
import { getRoomAccess } from "@/lib/room-access";
import { logSecurityEvent } from "@/lib/security-log";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

// Liveblocks times out auth at ~5s. We race against a 4s deadline so we
// return a clean 503 instead of letting the client hang until it times out.
const AUTH_TIMEOUT_MS = 4000;

export async function POST(request: Request) {
  const startedAt = Date.now();
  const respond = (status: number, body: BodyInit | null = null) => {
    const durationMs = Date.now() - startedAt;
    if (status !== 200 || durationMs > 2000) {
      console.warn("[liveblocks-auth]", { status, durationMs, room: currentRoom });
    }
    return new Response(body, { status });
  };

  let currentRoom: string | null = null;
  let user: Awaited<ReturnType<typeof getCurrentUser>>;

  try {
    const result = await Promise.race([
      getCurrentUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("auth_timeout")), AUTH_TIMEOUT_MS)
      ),
    ]);
    user = result;
  } catch (err) {
    const isTimeout = err instanceof Error && err.message === "auth_timeout";
    if (!isTimeout) console.error("[liveblocks-auth] getCurrentUser error:", err);
    return respond(isTimeout ? 503 : 500);
  }

  if (!user) {
    void logSecurityEvent({
      event: "liveblocks_auth_denied",
      route: "/api/liveblocks-auth",
      reason: "unauthorized",
    });
    return respond(401);
  }

  const { room } = await request.json();
  currentRoom = typeof room === "string" ? room : null;

  if (typeof room !== "string" || room.length === 0) {
    return respond(400);
  }

  // Attach real user info — this is what populates comment.userInfo.name
  // and comment.userInfo.avatar in every Liveblocks thread/comment
  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      name: user.displayName,
      avatar: user.avatarUrl ?? undefined,
    },
  });

  if (room === `user-inbox-${user.id}`) {
    session.allow(room, session.FULL_ACCESS);
    const { status, body } = await session.authorize();
    return respond(status, body);
  }

  if (room.startsWith("conversation-")) {
    const conversationId = room.replace("conversation-", "");
    const accessible = await getAccessibleConversation(conversationId, user.id);

    if (!accessible) {
      return respond(403);
    }
  } else {
    const access = await getRoomAccess(user.id, room);
    if (!access.allowed) {
      void logSecurityEvent({
        event: "liveblocks_auth_denied",
        route: "/api/liveblocks-auth",
        userId: user.id,
        targetId: room,
        reason: access.roomExists ? "forbidden_room_access" : "room_not_found",
      });
      return respond(access.roomExists ? 403 : 404);
    }
  }

  // Allow access to the requested room
  session.allow(room, session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  return respond(status, body);
}
