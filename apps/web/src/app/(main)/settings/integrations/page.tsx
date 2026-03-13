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
    <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect and manage your third-party integrations
        </p>
      </div>

      {/* Google Workspace Integration */}
      <div className="space-y-6">
        <GoogleConnection />
        <GoogleSettings />
        <GoogleStatusDashboard />
        <DriveWatchSettings />
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
          <div className="space-y-8">
            <div className="mb-8 space-y-4">
              <div className="h-9 w-64 bg-muted rounded animate-pulse" />
              <div className="h-5 w-96 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-64 bg-muted rounded animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  );
}

