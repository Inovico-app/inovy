import { tagsFor } from "@/lib/cache";
import { cacheTag } from "next/cache";
import { NotificationsQueries } from "../data-access/notifications.queries";
import type { NotificationFiltersDto } from "../dto/notification.dto";

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
  filters?: NotificationFiltersDto,
) {
  "use cache";
  cacheTag(...tagsFor("notification", { userId, organizationId: orgCode }));

  return await NotificationsQueries.getNotificationsByUser(
    userId,
    orgCode,
    filters,
  );
}

/**
 * Get unread notification count (cached)
 * Uses a separate cache tag from the full notification list so that
 * invalidating one does not unnecessarily bust the other.
 */
export async function getCachedUnreadCount(
  userId: string,
  orgCode: string,
): Promise<number> {
  "use cache";
  cacheTag(
    ...tagsFor("notificationUnreadCount", {
      userId,
      organizationId: orgCode,
    }),
  );

  return await NotificationsQueries.getUnreadCount(userId, orgCode);
}
