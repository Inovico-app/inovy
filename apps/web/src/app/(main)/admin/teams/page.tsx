import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamManagement } from "@/features/admin/components/team/team-management";
import { permissions } from "@/lib/permissions/engine";
import { requirePermission } from "@/lib/permissions/require-permission";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Team Management",
};

export default async function AdminTeamsPage() {
  await requirePermission(permissions.can("admin:all"));
  const t = await getTranslations("admin.teams");
  return (
    <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Team Management
          </h1>
          <p className="text-muted-foreground mt-2">{t("description")}</p>
        </div>
        <Suspense fallback={<Skeleton className="h-64" />}>
          <TeamManagement />
        </Suspense>
      </div>
    </div>
  );
}
