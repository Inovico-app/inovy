"use client";

import { getGoogleConnectionStatus } from "@/features/settings/actions/google-connection";
import { getMicrosoftConnectionStatus } from "@/features/integrations/microsoft/actions/connection-status";
import { useCallback, useEffect, useEffectEvent, useState } from "react";

export type CalendarProvider = "google" | "microsoft";

const PROVIDER_CONFIG = {
  google: {
    checkStatus: getGoogleConnectionStatus,
    urlParam: "google_connected",
  },
  microsoft: {
    checkStatus: getMicrosoftConnectionStatus,
    urlParam: "microsoft_connected",
  },
} as const;

export function useCalendarConnection(
  provider: CalendarProvider,
  currentStep: number,
) {
  const [connected, setConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  const config = PROVIDER_CONFIG[provider];

  const checkConnectionEffect = useEffectEvent(async () => {
    setCheckingStatus(true);
    try {
      const result = await config.checkStatus();
      if (result?.data?.connected) {
        setConnected(true);
      }
    } catch {
      // Ignore errors
    } finally {
      setCheckingStatus(false);
    }
  });

  const handleConnect = useCallback(() => {
    setShowPermissionDialog(true);
  }, []);

  useEffect(() => {
    if (currentStep === 4) {
      checkConnectionEffect();
    }
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get(config.urlParam) === "true") {
      checkConnectionEffect();
      window.history.replaceState({}, "", window.location.pathname);
    }
    // checkConnectionEffect is an effect event so no need to include it here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  return {
    connected,
    checkingStatus,
    handleConnect,
    showPermissionDialog,
    setShowPermissionDialog,
  };
}
