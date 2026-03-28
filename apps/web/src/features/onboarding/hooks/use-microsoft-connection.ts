"use client";

import { getMicrosoftConnectionStatus } from "@/features/integrations/microsoft/actions/connection-status";
import { useCallback, useEffect, useEffectEvent, useState } from "react";

export function useMicrosoftConnection(currentStep: number) {
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [checkingMicrosoftStatus, setCheckingMicrosoftStatus] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  const checkMicrosoftConnectionEffect = useEffectEvent(async () => {
    setCheckingMicrosoftStatus(true);
    try {
      const result = await getMicrosoftConnectionStatus();
      if (result?.data?.connected) {
        setMicrosoftConnected(true);
      }
    } catch {
      // Ignore errors
    } finally {
      setCheckingMicrosoftStatus(false);
    }
  });

  const handleConnectMicrosoft = useCallback(() => {
    setShowPermissionDialog(true);
  }, []);

  useEffect(() => {
    if (currentStep === 4) {
      checkMicrosoftConnectionEffect();
    }
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("microsoft_connected") === "true") {
      checkMicrosoftConnectionEffect();
      window.history.replaceState({}, "", window.location.pathname);
    }
    // checkMicrosoftConnectionEffect is an effect event so no need to include it here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  return {
    microsoftConnected,
    checkingMicrosoftStatus,
    handleConnectMicrosoft,
    showPermissionDialog,
    setShowPermissionDialog,
  };
}
