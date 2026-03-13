"use client";

import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface MfaSetupState {
  totpURI: string | null;
  backupCodes: string[];
  isEnabling: boolean;
  isVerifying: boolean;
  isDisabling: boolean;
  isEnabled: boolean;
}

export function useMfaSetup() {
  const [state, setState] = useState<MfaSetupState>({
    totpURI: null,
    backupCodes: [],
    isEnabling: false,
    isVerifying: false,
    isDisabling: false,
    isEnabled: false,
  });

  const enableMfa = useCallback(async (password: string) => {
    setState((prev) => ({ ...prev, isEnabling: true }));
    try {
      const result = await authClient.twoFactor.enable({
        password,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Failed to enable MFA");
        setState((prev) => ({ ...prev, isEnabling: false }));
        return false;
      }

      setState((prev) => ({
        ...prev,
        totpURI: result.data?.totpURI ?? null,
        backupCodes: result.data?.backupCodes ?? [],
        isEnabling: false,
      }));

      return true;
    } catch (error) {
      logger.error("MFA enable error", {
        error,
        component: "useMfaSetup",
        action: "enableMfa",
      });
      toast.error("An unexpected error occurred while enabling MFA");
      setState((prev) => ({ ...prev, isEnabling: false }));
      return false;
    }
  }, []);

  const verifyTotp = useCallback(async (code: string) => {
    setState((prev) => ({ ...prev, isVerifying: true }));
    try {
      const result = await authClient.twoFactor.verifyTotp({
        code,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Invalid verification code");
        setState((prev) => ({ ...prev, isVerifying: false }));
        return false;
      }

      setState((prev) => ({
        ...prev,
        isVerifying: false,
        isEnabled: true,
      }));

      toast.success("MFA has been enabled successfully");
      return true;
    } catch (error) {
      logger.error("MFA verify error", {
        error,
        component: "useMfaSetup",
        action: "verifyTotp",
      });
      toast.error("An unexpected error occurred during verification");
      setState((prev) => ({ ...prev, isVerifying: false }));
      return false;
    }
  }, []);

  const disableMfa = useCallback(async (password: string) => {
    setState((prev) => ({ ...prev, isDisabling: true }));
    try {
      const result = await authClient.twoFactor.disable({
        password,
      });

      if (result.error) {
        toast.error(result.error.message ?? "Failed to disable MFA");
        setState((prev) => ({ ...prev, isDisabling: false }));
        return false;
      }

      setState((prev) => ({
        ...prev,
        isDisabling: false,
        isEnabled: false,
        totpURI: null,
        backupCodes: [],
      }));

      toast.success("MFA has been disabled");
      return true;
    } catch (error) {
      logger.error("MFA disable error", {
        error,
        component: "useMfaSetup",
        action: "disableMfa",
      });
      toast.error("An unexpected error occurred while disabling MFA");
      setState((prev) => ({ ...prev, isDisabling: false }));
      return false;
    }
  }, []);

  return {
    ...state,
    enableMfa,
    verifyTotp,
    disableMfa,
  };
}
