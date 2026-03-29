import type { Metadata } from "next";
import { TasksListServer } from "@/features/tasks/components/tasks-list-server";
import { permissions } from "@/lib/permissions/engine";
import { requirePermission } from "@/lib/permissions/require-permission";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Team Tasks" };

export default async function TasksPage() {
  await requirePermission(permissions.hasRole("user"));
  const t = await getTranslations("tasks");

  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
      }
    >
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
            <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
          </div>
          <TasksListServer />
        </div>
      </div>
    </Suspense>
  );
}
