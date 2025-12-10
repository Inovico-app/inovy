import { NotificationsListServer } from "@/features/notifications/components/notifications-list-server";
import { Suspense } from "react";

/**
 * Notifications page
 * Shows all notifications for the authenticated user
 * Uses server-side data fetching with cache for optimal performance
 */
export default function NotificationsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Notificaties</h1>
          <p className="text-muted-foreground mt-2">
            Bekijk alle updates over je opnames en AI-verwerking
          </p>
        </div>

        {/* Notifications List - server-side fetching with cache */}
        <Suspense
          fallback={
            <div className="space-y-6">
              <div className="h-12 bg-muted rounded animate-pulse" />
              <div className="h-64 bg-muted rounded animate-pulse" />
            </div>
          }
        >
          <NotificationsListServer />
        </Suspense>
      </div>
    </div>
  );
}

