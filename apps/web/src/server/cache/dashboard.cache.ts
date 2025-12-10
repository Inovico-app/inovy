import { DashboardService } from "../services/dashboard.service";

/**
 * Cached dashboard queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get complete dashboard overview (cached)
 * Includes stats, recent projects, and recent recordings
 * Calls DashboardService which aggregates data from multiple sources
 * @param userId - User ID to get dashboard for
 */
export async function getCachedDashboardOverview(userId: string) {
  "use cache";
  // Note: We can't tag by orgCode here since DashboardService gets it internally
  // The service will handle organization scoping
  return await DashboardService.getDashboardOverview(userId);
}

