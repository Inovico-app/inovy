"use client";

import { IntegrationSettings } from "@/features/integrations/shared/components/integration-settings";
import {
  getGoogleSettings,
  updateGoogleSettings,
  resetGoogleSettings,
} from "../actions/google-settings";

interface GoogleSettingsProps {
  projectId?: string;
}

export function GoogleSettings({ projectId }: GoogleSettingsProps) {
  return (
    <IntegrationSettings
      provider="google"
      providerLabel="Google"
      projectId={projectId}
      getSettings={getGoogleSettings}
      updateSettings={updateGoogleSettings}
      resetSettings={resetGoogleSettings}
    />
  );
}
