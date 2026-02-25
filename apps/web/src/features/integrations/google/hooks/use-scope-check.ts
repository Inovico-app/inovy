"use client";

import { getGoogleConnectionStatus } from "@/features/settings/actions/google-connection";
import { useCallback, useEffect, useState } from "react";
import type { ScopeTier } from "../lib/scope-constants";
import { hasRequiredScopes } from "../lib/scope-utils";

interface UseScopeCheckResult {
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
 * Check whether the current user has the required OAuth scope tier.
 * Exposes `requestScope()` to open an incremental-permission dialog.
 */
export function useScopeCheck(requiredTier: ScopeTier): UseScopeCheckResult {
  const [isChecking, setIsChecking] = useState(true);
  const [hasScope, setHasScope] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      setIsChecking(true);
      try {
        const result = await getGoogleConnectionStatus();
        if (cancelled) return;

        if (result?.data?.connected && result.data.scopes) {
          setHasScope(hasRequiredScopes(result.data.scopes, requiredTier));
        } else {
          setHasScope(false);
        }
      } catch (error) {
        console.error("useScopeCheck fetch failed", { requiredTier, error });
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

