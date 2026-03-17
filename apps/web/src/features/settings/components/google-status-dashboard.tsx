"use client";

import { IntegrationStatusDashboard } from "@/features/integrations/shared/components/integration-status-dashboard";
import {
  getGoogleIntegrationStatus,
  retryFailedAction,
} from "../actions/google-status";

export function GoogleStatusDashboard() {
  return (
    <IntegrationStatusDashboard
      title="Integration Status"
      getStatus={getGoogleIntegrationStatus}
      retryAction={retryFailedAction}
    />
  );
}
