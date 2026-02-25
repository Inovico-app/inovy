import { getGoogleConnectionStatus } from "@/features/settings/actions/google-connection";
import { useCallback, useEffect, useEffectEvent, useState } from "react";

export function useGoogleConnection(currentStep: number) {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [checkingGoogleStatus, setCheckingGoogleStatus] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  const checkGoogleConnectionEffect = useEffectEvent(async () => {
    setCheckingGoogleStatus(true);
    try {
      const result = await getGoogleConnectionStatus();
      if (result?.data?.connected) {
        setGoogleConnected(true);
      }
    } catch {
      // Ignore errors
    } finally {
      setCheckingGoogleStatus(false);
    }
  });

  const handleConnectGoogle = useCallback(() => {
    setShowPermissionDialog(true);
  }, []);

  const handlePermissionDialogChange = useCallback((open: boolean) => {
    setShowPermissionDialog(open);
  }, []);

  useEffect(() => {
    if (currentStep === 4) {
      checkGoogleConnectionEffect();
    }
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("google_connected") === "true") {
      checkGoogleConnectionEffect();
      window.history.replaceState({}, "", window.location.pathname);
    }
    // checkGoogleConnectEffect is an effect event so no need to include it here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  return {
    googleConnected,
    checkingGoogleStatus,
    handleConnectGoogle,
    showPermissionDialog,
    handlePermissionDialogChange,
  };
}

