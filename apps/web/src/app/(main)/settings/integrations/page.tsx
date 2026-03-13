import { PageHeader } from "@/components/page-header";
import { DriveWatchSettings } from "@/features/settings/components/drive-watch-settings";
import { GoogleConnection } from "@/features/settings/components/google-connection";
import { GoogleSettings } from "@/features/settings/components/google-settings";
import { GoogleStatusDashboard } from "@/features/settings/components/google-status-dashboard";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function IntegrationsContent() {
  const authResult = await getBetterAuthSession();
  if (authResult.isErr() || !authResult.value.organization) {
    redirect("/settings");
  }

  const hasPermission = await checkPermission(Permissions.integration.manage);
  if (!hasPermission) {
    redirect("/settings");
  }

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Connect and manage your third-party integrations"
      />
      <div className="space-y-6">
        <GoogleConnection />
        <GoogleSettings />
        <GoogleStatusDashboard />
        <DriveWatchSettings />
      </div>
    </>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-80 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  );
}
