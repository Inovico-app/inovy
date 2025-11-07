import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { NotificationsQueries } from "../data-access/notifications.queries";
import type { NotificationFiltersDto } from "../dto";

/**
 * Cached notification queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get notifications by user (cached)
 */
export async function getCachedNotifications(
  userId: string,
  orgCode: string,
  filters?: NotificationFiltersDto
) {
  "use cache";
  cacheTag(CacheTags.notifications(userId, orgCode));

  return await NotificationsQueries.getNotificationsByUser(
    userId,
    orgCode,
    filters
  );
}

/**
 * Get unread notification count (cached)
 */
export async function getCachedUnreadCount(
  userId: string,
  orgCode: string
): Promise<number> {
  "use cache";
  cacheTag(
    CacheTags.notificationUnreadCount(userId, orgCode),
    CacheTags.notifications(userId, orgCode)
  );

  return await NotificationsQueries.getUnreadCount(userId, orgCode);
}

