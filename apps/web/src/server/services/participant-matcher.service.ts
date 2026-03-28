import { logger } from "@/lib/logger";

interface OrgMember {
  id: string;
  name: string | null;
  email: string;
}

interface MatchResult {
  userId: string | null;
  matchType: "speaker_id" | "exact" | "partial" | "fuzzy" | "none";
}

export class ParticipantMatcher {
  /**
   * Match an assignee name to an organization member.
   *
   * Cascade: speaker ID lookup → exact name → partial name → Levenshtein fuzzy.
   * Returns the matched userId or null if no confident match.
   */
  static match(
    assigneeName: string,
    orgMembers: OrgMember[],
    speakerUserIds?: Record<string, string> | null,
    speakerIndex?: number,
  ): MatchResult {
    if (!assigneeName.trim()) {
      return { userId: null, matchType: "none" };
    }

    // Step 1: Speaker ID lookup
    if (
      speakerIndex !== undefined &&
      speakerUserIds &&
      speakerUserIds[String(speakerIndex)]
    ) {
      const userId = speakerUserIds[String(speakerIndex)];
      const member = orgMembers.find((m) => m.id === userId);
      if (member) {
        return { userId, matchType: "speaker_id" };
      }
    }

    const normalizedName = assigneeName.trim().toLowerCase();

    // Step 2: Exact match against full name
    const exactMatches = orgMembers.filter(
      (m) => m.name?.toLowerCase() === normalizedName,
    );
    if (exactMatches.length === 1) {
      return { userId: exactMatches[0].id, matchType: "exact" };
    }

    // Step 3: Partial match against first or last name
    const partialMatches = orgMembers.filter((m) => {
      if (!m.name) return false;
      const parts = m.name.toLowerCase().split(/\s+/);
      return parts.some((part) => part === normalizedName);
    });
    if (partialMatches.length === 1) {
      return { userId: partialMatches[0].id, matchType: "partial" };
    }

    // Step 4: Levenshtein fuzzy match
    const candidates = orgMembers
      .filter((m) => m.name)
      .map((m) => ({
        member: m,
        distance: levenshtein(normalizedName, m.name!.toLowerCase()),
      }))
      .sort((a, b) => a.distance - b.distance);

    if (candidates.length >= 1) {
      const best = candidates[0];
      const secondBest = candidates.length >= 2 ? candidates[1] : null;

      if (
        best.distance <= 2 &&
        (!secondBest || secondBest.distance - best.distance >= 2)
      ) {
        logger.info("Fuzzy matched participant", {
          component: "ParticipantMatcher",
          assigneeName,
          matchedName: best.member.name,
          distance: best.distance,
        });
        return { userId: best.member.id, matchType: "fuzzy" };
      }
    }

    return { userId: null, matchType: "none" };
  }
}

/**
 * Compute Levenshtein edit distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}
