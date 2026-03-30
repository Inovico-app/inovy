import { Skeleton } from "@/components/ui/skeleton";
import { ComplianceDashboardQueries } from "@/server/data-access/compliance-dashboard.queries";
import { ComplianceDashboard } from "@/features/admin/components/compliance/compliance-dashboard";
import { permissions } from "@/lib/permissions/engine";
import { requirePermission } from "@/lib/permissions/require-permission";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AVG Compliance",
  description: "Overzicht van gegevensbescherming en AVG-naleving",
};

async function ComplianceDashboardContent() {
  const { organizationId } = await requirePermission(
    permissions.can("admin:all"),
  );
  const data =
    await ComplianceDashboardQueries.getFullDashboard(organizationId);

  return (
    <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">AVG Compliance</h1>
        <p className="text-muted-foreground mt-2">
          Overzicht van gegevensbescherming en AVG-naleving voor uw organisatie.
        </p>
      </div>
      <ComplianceDashboard data={data} />
    </div>
  );
}

export default function CompliancePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
          <div className="mb-10 space-y-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      }
    >
      <ComplianceDashboardContent />
    </Suspense>
  );
}
