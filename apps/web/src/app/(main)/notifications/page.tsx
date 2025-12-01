import { NotificationList } from "@/features/notifications/components/notification-list";
import { Suspense } from "react";

/**
 * Notifications page
 * Shows all notifications for the authenticated user
 * Uses client-side data fetching via React Query
 */
export default function NotificationsPage() {
  // CACHE COMPONENTS: Wrap dynamic content in Suspense to enable static shell generation
  // NotificationList accesses auth data and notifications, making it dynamic
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
      }
    >
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Notificaties</h1>
            <p className="text-muted-foreground mt-2">
              Bekijk alle updates over je opnames en AI-verwerking
            </p>
          </div>

          {/* Notifications List - client-side fetching */}
          <NotificationList />
        </div>
      </div>
    </Suspense>
  );
}

