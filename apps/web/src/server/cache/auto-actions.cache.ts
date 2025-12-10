import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { AutoActionsService } from "../services/auto-actions.service";

/**
 * Cached auto-actions queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get auto action stats (cached)
 * Calls AutoActionsService which includes business logic
 */
export async function getCachedAutoActionStats(
  userId: string,
  organizationId: string,
  provider: "google" | "microsoft"
) {
  "use cache";
  cacheTag(CacheTags.autoActionStats(userId));
  return await AutoActionsService.getAutoActionStats(
    userId,
    organizationId,
    provider
  );
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
) {
  "use cache";
  cacheTag(CacheTags.autoActions(userId));
  return await AutoActionsService.getRecentAutoActions(
    userId,
    organizationId,
    provider,
    options
  );
}

