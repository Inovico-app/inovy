import { PageHeader } from "@/components/page-header";
import { MicrosoftConnection } from "@/features/integrations/microsoft/components/microsoft-connection";
import { MicrosoftSettings } from "@/features/integrations/microsoft/components/microsoft-settings";
import { MicrosoftStatusDashboard } from "@/features/integrations/microsoft/components/microsoft-status-dashboard";
import { DriveWatchSettings } from "@/features/settings/components/drive-watch-settings";
import { GoogleConnection } from "@/features/settings/components/google-connection";
import { GoogleSettings } from "@/features/settings/components/google-settings";
import { GoogleStatusDashboard } from "@/features/settings/components/google-status-dashboard";
import { IntegrationsTabs } from "@/features/settings/components/integrations-tabs";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

async function IntegrationsContent() {
  const t = await getTranslations("settings.integrations");
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
      <PageHeader title={t("title")} description={t("description")} />
      <IntegrationsTabs
        googleContent={
          <>
            <GoogleConnection />
            <GoogleSettings />
            <GoogleStatusDashboard />
            <DriveWatchSettings />
          </>
        }
        microsoftContent={
          <>
            <MicrosoftConnection />
            <MicrosoftSettings />
            <MicrosoftStatusDashboard />
          </>
        }
      />
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
          <div className="h-11 w-full bg-muted rounded-lg animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  );
}
