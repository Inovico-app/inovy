"use client";

import { getMicrosoftConnectionStatus } from "@/features/integrations/microsoft/actions/connection-status";
import { useCallback, useEffect, useState } from "react";
import type { MsScopeTier } from "../lib/scope-constants";
import { hasRequiredMsScopes } from "../lib/scope-utils";

interface UseMicrosoftScopeCheckResult {
  hasScope: boolean;
  isChecking: boolean;
  /** Whether the incremental permission dialog should be shown. */
  showDialog: boolean;
  /** Open the incremental permission dialog. */
  requestScope: () => void;
  /** Close the dialog (e.g. user clicks "Not now"). */
  dismissDialog: () => void;
}

/**
 * Check whether the current user has the required Microsoft OAuth scope tier.
 * Exposes `requestScope()` to open an incremental-permission dialog.
 */
export function useMicrosoftScopeCheck(
  requiredTier: MsScopeTier,
): UseMicrosoftScopeCheckResult {
  const [isChecking, setIsChecking] = useState(true);
  const [hasScope, setHasScope] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      setIsChecking(true);
      try {
        const result = await getMicrosoftConnectionStatus();
        if (cancelled) return;

        if (result?.data?.connected && result.data.scopes) {
          setHasScope(hasRequiredMsScopes(result.data.scopes, requiredTier));
        } else {
          setHasScope(false);
        }
      } catch (error) {
        console.error("useMicrosoftScopeCheck fetch failed", {
          requiredTier,
          error,
        });
        if (!cancelled) setHasScope(false);
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [requiredTier]);

  const requestScope = useCallback(() => {
    setShowDialog(true);
  }, []);

  const dismissDialog = useCallback(() => {
    setShowDialog(false);
  }, []);

  return { hasScope, isChecking, showDialog, requestScope, dismissDialog };
}
