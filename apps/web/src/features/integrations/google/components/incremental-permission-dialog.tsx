"use client";

import { SharedIncrementalPermissionDialog } from "@/features/integrations/shared/components/incremental-permission-dialog";
import type { ScopeTier } from "../lib/scope-constants";
import {
  getIncrementalAuthUrl,
  tierToDescription,
  tierToLabel,
} from "../lib/scope-utils";

interface IncrementalPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: ScopeTier;
  /** URL to redirect back to after the user grants the permission. */
  returnUrl?: string;
}

/**
 * Shown when a user triggers a feature that requires a Google OAuth scope
 * they haven't granted yet. Explains why the additional permission is
 * needed and redirects to Google's incremental consent screen.
 */
export function IncrementalPermissionDialog({
  open,
  onOpenChange,
  tier,
  returnUrl,
}: IncrementalPermissionDialogProps) {
  return (
    <SharedIncrementalPermissionDialog
      open={open}
      onOpenChange={onOpenChange}
      tier={tier}
      returnUrl={returnUrl}
      providerLabel="Google"
      getAuthUrl={getIncrementalAuthUrl}
      tierToLabel={tierToLabel}
      tierToDescription={tierToDescription}
    />
  );
}
