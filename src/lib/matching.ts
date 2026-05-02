import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { expertProfiles, topics, userSettings, userTopics, users } from "@/db/schema";
import { discoveryIntentLabels, type DiscoveryIntent } from "@/lib/discovery-intent";
import { getUserDiscoveryIntent, hasDiscoveryIntentColumn } from "@/lib/user-settings-compat";

type UserRole = "learner" | "expert";

export type MatchSuggestion = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: UserRole;
  headline: string | null;
  verificationStatus: "pending" | "verified" | "rejected" | null;
  discoveryIntent: DiscoveryIntent | null;
  intentLabel: string | null;
  score: number;
  matchType: "expert_for_learner" | "learner_for_expert";
  summary: string;
  sharedTopics: string[];
};

export async function getMatchSuggestionsForUser(
  userId: string,
  role: UserRole,
  limit = 4
): Promise<MatchSuggestion[]> {
  // 1. Get ALL topics for the current user (both interested + teaches)
  const myTopics = await db
    .select({ topicId: userTopics.topicId, relationship: userTopics.relationship })
    .from(userTopics)
    .where(eq(userTopics.userId, userId));

  if (myTopics.length === 0) return [];

  // 2. Determine which topic IDs to use as the matching source
  //    Learner: prefer "interested" topics, fall back to all
  //    Expert:  prefer "teaches" topics, fall back to all
  const preferredRelationship = role === "learner" ? "interested" : "teaches";
  const preferredTopics = myTopics.filter((t) => t.relationship === preferredRelationship);
  const sourceTopics = preferredTopics.length > 0 ? preferredTopics : myTopics;
  const sourceTopicIds = Array.from(new Set(sourceTopics.map((t) => t.topicId)));

  // 3. The candidate must have the OPPOSITE relationship on those topics
  //    Learner wants to learn X → find experts who TEACH X
  //    Expert teaches X → find learners who are INTERESTED in X
  //    FALLBACK: also match experts who are INTERESTED in the same topics
  //    (many experts haven't set 'teaches' explicitly)
  const primaryCandidateRelationship = role === "learner" ? "teaches" : "interested";
  const candidateRole: UserRole = role === "learner" ? "expert" : "learner";

  const supportsDiscoveryIntent = await hasDiscoveryIntentColumn();
  const myIntent = await getUserDiscoveryIntent(userId);

  // 4. Query candidates — two passes:
  //    Pass A: candidates with the ideal relationship (teaches/interested)
  //    Pass B: candidates with ANY relationship on the same topics (catches experts
  //            who listed topics as 'interested' but are clearly experts in them)
  const buildQuery = (relationship: string) =>
    db
      .select({
        userId: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        role: users.role,
        topicId: userTopics.topicId,
        topicName: topics.name,
        headline: expertProfiles.headline,
        verificationStatus: expertProfiles.verificationStatus,
        ratingAvg: expertProfiles.ratingAvg,
        reviewCount: expertProfiles.reviewCount,
        discoveryIntent: supportsDiscoveryIntent
          ? userSettings.discoveryIntent
          : sql<DiscoveryIntent | null>`null`,
        searchableProfile: userSettings.searchableProfile,
        profileVisibility: userSettings.profileVisibility,
        isSuspended: users.isSuspended,
        relationshipType: userTopics.relationship,
      })
      .from(userTopics)
      .innerJoin(users, eq(users.id, userTopics.userId))
      .innerJoin(topics, eq(topics.id, userTopics.topicId))
      .leftJoin(userSettings, eq(userSettings.userId, users.id))
      .leftJoin(expertProfiles, eq(expertProfiles.userId, users.id))
      .where(
        and(
          inArray(userTopics.topicId, sourceTopicIds),
          eq(userTopics.relationship, relationship),
          eq(users.role, candidateRole),
          ne(users.id, userId)
        )
      );

  // Run both queries in parallel
  const [primaryRows, fallbackRows] = await Promise.all([
    buildQuery(primaryCandidateRelationship),
    // Fallback: for learner→expert, also match experts who are 'interested' in same topics
    role === "learner" ? buildQuery("interested") : Promise.resolve([]),
  ]);

  // Merge: primary rows get full score, fallback rows get reduced score
  const rows = [
    ...primaryRows.map((r) => ({ ...r, isPrimary: true })),
    ...fallbackRows.map((r) => ({ ...r, isPrimary: false })),
  ];

  // 5. Build suggestion map — aggregate shared topics per candidate
  const suggestionMap = new Map<string, MatchSuggestion & {
    _topicIds: Set<string>;
    _ratingAvg: number;
    _reviewCount: number;
  }>();

  for (const row of rows) {
    // Respect privacy settings and suspension
    if (row.searchableProfile === false) continue;
    if (row.profileVisibility === "private") continue;
    if (row.isSuspended === true) continue;

    const topicScore = row.isPrimary ? SCORE.PER_SHARED_TOPIC : SCORE.PER_SHARED_TOPIC_FALLBACK;
    const existing = suggestionMap.get(row.userId);

    if (existing) {
      if (!existing._topicIds.has(row.topicId)) {
        existing._topicIds.add(row.topicId);
        existing.sharedTopics.push(row.topicName);
        existing.score += topicScore;
      }
    } else {
      const intentBonus = computeIntentBonus(myIntent, row.discoveryIntent ?? null);
      const profileBonus = computeProfileBonus(row.verificationStatus, row.headline, row.ratingAvg, row.reviewCount);
      // Bonus for explicit 'teaches' relationship
      const teachesBonus = row.relationshipType === "teaches" ? SCORE.EXPLICIT_TEACHES : 0;

      suggestionMap.set(row.userId, {
        userId: row.userId,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        bio: row.bio,
        role: row.role,
        headline: row.headline,
        verificationStatus: row.verificationStatus,
        discoveryIntent: row.discoveryIntent ?? null,
        intentLabel: row.discoveryIntent ? discoveryIntentLabels[row.discoveryIntent] : null,
        score: topicScore + intentBonus + profileBonus + teachesBonus,
        matchType: role === "learner" ? "expert_for_learner" : "learner_for_expert",
        summary: buildSummary(role, row.discoveryIntent ?? null),
        sharedTopics: [row.topicName],
        _topicIds: new Set([row.topicId]),
        _ratingAvg: row.ratingAvg ?? 0,
        _reviewCount: row.reviewCount ?? 0,
      });
    }
  }

  // 6. Also include candidates who share ANY topic (not just preferred relationship)
  //    This handles the case where a learner has both "interested" and "teaches" topics
  //    and the expert matches on a "teaches" topic the learner also teaches
  //    → already handled above since we use sourceTopicIds from preferred topics

  // 7. Sort: primary = score desc, secondary = shared topic count desc, tertiary = rating desc
  return Array.from(suggestionMap.values())
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.sharedTopics.length !== a.sharedTopics.length) return b.sharedTopics.length - a.sharedTopics.length;
      if (b._ratingAvg !== a._ratingAvg) return b._ratingAvg - a._ratingAvg;
      return a.displayName.localeCompare(b.displayName);
    })
    .map(({ _topicIds, _ratingAvg, _reviewCount, ...suggestion }) => suggestion)
    .slice(0, limit);
}

// ─── Scoring constants ────────────────────────────────────────────────────────
const SCORE = {
  PER_SHARED_TOPIC: 10,        // Explicit teaches/interested match
  PER_SHARED_TOPIC_FALLBACK: 6, // Same topic but via 'interested' (expert hasn't set teaches)
  EXPLICIT_TEACHES: 4,          // Bonus for expert who explicitly set 'teaches'
  INTENT_EXACT_MATCH: 8,
  INTENT_PARTIAL: 3,
  VERIFIED: 5,
  HAS_HEADLINE: 2,
  HAS_RATING: 3,
  HIGH_RATING: 4,
} as const;

// Intent groups — intents in the same group get partial bonus
const INTENT_GROUPS: DiscoveryIntent[][] = [
  ["career_growth", "interview_prep", "portfolio_building"],
  ["academic_support", "hobby_learning"],
  ["mentorship"],
];

function computeIntentBonus(
  myIntent: DiscoveryIntent | null | undefined,
  candidateIntent: DiscoveryIntent | null
): number {
  if (!myIntent || !candidateIntent) return 0;
  if (myIntent === candidateIntent) return SCORE.INTENT_EXACT_MATCH;

  // Partial bonus for related intents
  const sameGroup = INTENT_GROUPS.some(
    (group) => group.includes(myIntent) && group.includes(candidateIntent)
  );
  return sameGroup ? SCORE.INTENT_PARTIAL : 0;
}

function computeProfileBonus(
  verificationStatus: "pending" | "verified" | "rejected" | null,
  headline: string | null,
  ratingAvg: number | null,
  reviewCount: number | null
): number {
  let bonus = 0;
  if (verificationStatus === "verified") bonus += SCORE.VERIFIED;
  if (headline) bonus += SCORE.HAS_HEADLINE;
  if ((reviewCount ?? 0) > 0) bonus += SCORE.HAS_RATING;
  if ((ratingAvg ?? 0) >= 80) bonus += SCORE.HIGH_RATING; // 4.0+ stars
  return bonus;
}

function buildSummary(role: UserRole, intent: DiscoveryIntent | null): string {
  const base =
    role === "learner"
      ? "Teaches topics that match what you want to learn."
      : "Is actively learning topics you can help with.";
  if (!intent) return base;
  return `${base} Intent: ${discoveryIntentLabels[intent]}.`;
}
