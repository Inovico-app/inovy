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
 */
export async function getCachedDashboardOverview(organizationId: string) {
  "use cache";
  cacheTag(
    CacheTags.dashboardStats(organizationId),
    CacheTags.recentProjects(organizationId),
    CacheTags.recentRecordings(organizationId)
  );
  return await DashboardService.getDashboardOverview(organizationId);
}

