import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";
import { expireStaleScheduledRooms } from "@/lib/room-status";
import { getMatchSuggestionsForUser } from "@/lib/matching";
import { ensureMatchSuggestionNotifications } from "@/lib/match-notifications";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await expireStaleScheduledRooms();

  const suggestions = await getMatchSuggestionsForUser(user.id, user.role, 4);
  await ensureMatchSuggestionNotifications(user.id, user.role, suggestions);

  return NextResponse.json({ success: true });
}
