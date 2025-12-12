import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import type { AutoAction } from "../db/schema/auto-actions";
import { AutoActionsService } from "../services/auto-actions.service";

/**
 * Cached auto-actions queries
 * Uses Next.js 16 cache with tags for invalidation
 */

export interface AutoActionStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  calendarEvents: number;
  emailDrafts: number;
}

export type RecentAutoAction = AutoAction & {
  recordingTitle?: string;
  taskTitle?: string;
};

/**
 * Get auto action stats (cached)
 * Calls AutoActionsService which includes business logic
 */
export async function getCachedAutoActionStats(
  userId: string,
  organizationId: string,
  provider: "google" | "microsoft"
): Promise<AutoActionStats | null> {
  "use cache";
  cacheTag(CacheTags.autoActionStats(userId));
  const result = await AutoActionsService.getAutoActionStats(
    userId,
    organizationId,
    provider
  );
  return result.isOk() ? result.value : null;
}

/**
 * Get recent auto actions (cached)
 * Calls AutoActionsService which includes business logic
 */
export async function getCachedRecentAutoActions(
  userId: string,
  organizationId: string,
  provider: "google" | "microsoft",
  options?: { limit?: number; type?: "calendar_event" | "email_draft" }
): Promise<RecentAutoAction[]> {
  "use cache";
  cacheTag(CacheTags.autoActions(userId));
  const result = await AutoActionsService.getRecentAutoActions(
    userId,
    organizationId,
    provider,
    options
  );
  return result.isOk() ? result.value : [];
}

