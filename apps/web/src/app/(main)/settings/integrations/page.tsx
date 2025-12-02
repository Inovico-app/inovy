import { DriveWatchSettings } from "@/features/settings/components/drive-watch-settings";
import { GoogleConnection } from "@/features/settings/components/google-connection";
import { GoogleSettings } from "@/features/settings/components/google-settings";
import { GoogleStatusDashboard } from "@/features/settings/components/google-status-dashboard";
import { Suspense } from "react";

function IntegrationsContent() {
  return (
    <div className="container mx-auto max-w-6xl py-12 px-6">
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
        <div className="container mx-auto max-w-6xl py-12 px-6">
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

