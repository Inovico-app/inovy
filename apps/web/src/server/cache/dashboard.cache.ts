"use cache";

import { tagsFor } from "@/lib/cache";
import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { DashboardService } from "../services/dashboard.service";
import type { BetterAuthUser } from "@/lib/auth";

/**
 * Cached dashboard queries
 * Uses Next.js 16 cache with tags for invalidation
 */

interface DashboardTeamContext {
  userTeamIds?: string[];
  user?: BetterAuthUser;
}

/**
 * Get complete dashboard overview (cached)
 * Includes stats, recent projects, and recent recordings
 * Calls DashboardService which aggregates data from multiple sources
 * @param organizationId - Must be fetched outside cache scope (e.g., from session in page component)
 * @param teamContext - Team context for filtering by team visibility (included in cache key)
 */
export async function getCachedDashboardOverview(
  organizationId: string,
  teamContext?: DashboardTeamContext,
) {
  "use cache";
  cacheTag(
    ...tagsFor("dashboard", { organizationId }),
    CacheTags.recentProjects(organizationId),
    CacheTags.recentRecordings(organizationId),
  );

  const result = await DashboardService.getDashboardOverview(
    organizationId,
    teamContext,
  );
  if (result.isErr()) {
    return null;
  }

  return result.value ?? null;
}
