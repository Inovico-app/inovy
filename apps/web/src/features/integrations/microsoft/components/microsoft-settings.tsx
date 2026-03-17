"use client";

import { IntegrationSettings } from "@/features/integrations/shared/components/integration-settings";
import {
  getMicrosoftSettings,
  resetMicrosoftSettings,
  updateMicrosoftSettings,
} from "@/features/settings/actions/microsoft-settings";

interface MicrosoftSettingsProps {
  projectId?: string;
}

export function MicrosoftSettings({ projectId }: MicrosoftSettingsProps) {
  return (
    <IntegrationSettings
      provider="microsoft"
      providerLabel="Microsoft"
      projectId={projectId}
      getSettings={getMicrosoftSettings}
      updateSettings={updateMicrosoftSettings}
      resetSettings={resetMicrosoftSettings}
    />
  );
}
