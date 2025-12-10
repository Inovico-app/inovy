import { getBetterAuthSession } from "@/lib/better-auth-session";
import {
  getCachedNotifications,
  getCachedUnreadCount,
} from "@/server/cache/notification.cache";
import type { NotificationDto, NotificationListDto } from "@/server/dto/notification.dto";
import { NotificationListClient } from "./notification-list-client";

/**
 * Server component that fetches notifications data and passes it to client component
 * Uses cache functions for optimal performance
 */
export async function NotificationsListServer() {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr() || !authResult.value.isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Authentication required</p>
      </div>
    );
  }

  const { user, organization } = authResult.value;

  if (!user || !organization) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">User or organization not found</p>
      </div>
    );
  }

  // Fetch notifications and unread count in parallel (both cached)
  const [allNotificationsResult, unreadNotificationsResult, unreadCount] =
    await Promise.all([
      getCachedNotifications(user.id, organization.id),
      getCachedNotifications(user.id, organization.id, { unreadOnly: true }),
      getCachedUnreadCount(user.id, organization.id),
    ]);

  // Convert Notification[] to NotificationDto[] (they have the same structure)
  // The schema Notification type matches NotificationDto interface
  const allNotifications: NotificationListDto = {
    notifications: allNotificationsResult as NotificationDto[],
    total: allNotificationsResult.length,
    unreadCount,
  };

  const unreadNotifications: NotificationListDto = {
    notifications: unreadNotificationsResult as NotificationDto[],
    total: unreadNotificationsResult.length,
    unreadCount,
  };

  return (
    <NotificationListClient
      initialAllNotifications={allNotifications}
      initialUnreadNotifications={unreadNotifications}
      initialUnreadCount={unreadCount}
    />
  );
}

