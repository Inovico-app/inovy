import { PageHeader } from "@/components/page-header";
import { MicrosoftConnection } from "@/features/integrations/microsoft/components/microsoft-connection";
import { MicrosoftSettings } from "@/features/integrations/microsoft/components/microsoft-settings";
import { MicrosoftStatusDashboard } from "@/features/integrations/microsoft/components/microsoft-status-dashboard";
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
      <div className="space-y-10">
        {/* Google Workspace */}
        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Google Workspace</h2>
            <p className="text-sm text-muted-foreground">
              Connect your Google account to enable Calendar and Gmail features
            </p>
          </div>
          <GoogleConnection />
          <GoogleSettings />
          <GoogleStatusDashboard />
          <DriveWatchSettings />
        </section>

        <hr className="border-border" />

        {/* Microsoft 365 */}
        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Microsoft 365</h2>
            <p className="text-sm text-muted-foreground">
              Connect your Microsoft account to enable Outlook Calendar, Teams,
              and OneDrive features
            </p>
          </div>
          <MicrosoftConnection />
          <MicrosoftSettings />
          <MicrosoftStatusDashboard />
        </section>
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
