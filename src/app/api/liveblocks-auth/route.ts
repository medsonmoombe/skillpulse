import { Liveblocks } from "@liveblocks/node";
import { getCurrentUser } from "@/lib/currentUser";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response(null, { status: 401 });
  }

  // Create a session for the current user
  const session = liveblocks.prepareSession(user.id);

  // Give the user access to the room
  const { room } = await request.json();
  session.allow(room, session.FULL_ACCESS);

  // Authorize the session
  const { status, body } = await session.authorize();
  return new Response(body, { status });
}