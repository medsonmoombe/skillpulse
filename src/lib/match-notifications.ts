import type { MatchSuggestion } from "@/lib/matching";
import { NotificationService } from "@/services/notificationService";

export async function ensureMatchSuggestionNotifications(
  userId: string,
  role: "learner" | "expert",
  suggestions: MatchSuggestion[]
) {
  const strongSuggestions = suggestions.filter((suggestion) => suggestion.score >= 8).slice(0, 2);

  await Promise.all(
    strongSuggestions.map((suggestion) =>
      NotificationService.createIfNotRecent({
        userId,
        title:
          role === "learner"
            ? `A strong expert match is ready for you`
            : `A learner match is worth reaching out to`,
        message: buildMatchSuggestionMessage(suggestion.displayName, suggestion.sharedTopics, suggestion.intentLabel),
        type: "match_suggestion",
        entityType: "profile",
        entityId: suggestion.userId,
        actionUrl: `/profile/${suggestion.userId}`,
        dedupeHours: 72,
      })
    )
  );
}

function buildMatchSuggestionMessage(
  displayName: string,
  sharedTopics: string[],
  intentLabel: string | null
) {
  const topicSummary =
    sharedTopics.length > 0
      ? `Shared topic${sharedTopics.length === 1 ? "" : "s"}: ${sharedTopics.slice(0, 2).join(", ")}.`
      : "Shared interests are trending strong.";

  if (intentLabel) {
    return `${displayName} matches your current intent around ${intentLabel}. ${topicSummary}`;
  }

  return `${displayName} is showing strong topic alignment for your next conversation. ${topicSummary}`;
}
