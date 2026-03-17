"use client";

import { IntegrationStatusDashboard } from "@/features/integrations/shared/components/integration-status-dashboard";
import {
  getMicrosoftIntegrationStatus,
  retryMicrosoftFailedAction,
} from "@/features/settings/actions/microsoft-status";

export function MicrosoftStatusDashboard() {
  return (
    <IntegrationStatusDashboard
      title="Microsoft Integration Status"
      getStatus={getMicrosoftIntegrationStatus}
      retryAction={retryMicrosoftFailedAction}
    />
  );
}
