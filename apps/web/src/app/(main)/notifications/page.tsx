import { NotificationsListServer } from "@/features/notifications/components/notifications-list-server";
import type { Metadata } from "next";
import { permissions } from "@/lib/permissions/engine";
import { requirePermission } from "@/lib/permissions/require-permission";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await requirePermission(permissions.hasRole("viewer"));
  const t = await getTranslations("notifications");

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
        </div>
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
