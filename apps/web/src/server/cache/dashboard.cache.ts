"use cache";

import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { DashboardService } from "../services/dashboard.service";

/**
 * Cached dashboard queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get complete dashboard overview (cached)
 * Includes stats, recent projects, and recent recordings
 * Calls DashboardService which aggregates data from multiple sources
 * @param organizationId - Must be fetched outside cache scope (e.g., from session in page component)
 */
export async function getCachedDashboardOverview(organizationId: string) {
  "use cache";
  cacheTag(
    CacheTags.dashboardStats(organizationId),
    CacheTags.recentProjects(organizationId),
    CacheTags.recentRecordings(organizationId)
  );

  const result = await DashboardService.getDashboardOverview(organizationId);
  if (result.isErr()) {
    return null;
  }

  return result.value ?? null;
}

