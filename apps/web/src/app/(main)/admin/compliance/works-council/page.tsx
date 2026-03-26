import { Skeleton } from "@/components/ui/skeleton";
import { resolveAuthContext } from "@/lib/auth-context";
import { WorksCouncilQueries } from "@/server/data-access/works-council.queries";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { WorksCouncilDashboard } from "@/features/admin/components/compliance/works-council-dashboard";

export const metadata: Metadata = {
  title: "Ondernemingsraad",
  description: "OR-goedkeuring voor vergaderopnames",
};

async function WorksCouncilContent() {
  const authResult = await resolveAuthContext("WorksCouncilPage");
  if (authResult.isErr()) {
    redirect("/");
  }

  const { organizationId } = authResult.value;

  const [activeApproval, approvals] = await Promise.all([
    WorksCouncilQueries.findActiveByOrganization(organizationId),
    WorksCouncilQueries.findAllByOrganization(organizationId),
  ]);

  return (
    <WorksCouncilDashboard
      activeApproval={activeApproval}
      approvals={approvals}
    />
  );
}

export default function WorksCouncilPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
          <div className="mb-10 space-y-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-32 w-full mb-8" />
          <Skeleton className="h-64 w-full mb-8" />
          <Skeleton className="h-48 w-full" />
        </div>
      }
    >
      <WorksCouncilContent />
    </Suspense>
  );
}
