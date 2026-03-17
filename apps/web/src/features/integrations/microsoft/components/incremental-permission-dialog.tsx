"use client";

import { SharedIncrementalPermissionDialog } from "@/features/integrations/shared/components/incremental-permission-dialog";
import type { MsScopeTier } from "../lib/scope-constants";
import {
  getIncrementalAuthUrl,
  msTierToDescription,
  msTierToLabel,
} from "../lib/scope-utils";

interface MsIncrementalPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: MsScopeTier;
  /** URL to redirect back to after the user grants the permission. */
  returnUrl?: string;
}

/**
 * Shown when a user triggers a feature that requires a Microsoft OAuth scope
 * they haven't granted yet. Explains why the additional permission is
 * needed and redirects to Microsoft's incremental consent screen.
 */
export function MsIncrementalPermissionDialog({
  open,
  onOpenChange,
  tier,
  returnUrl,
}: MsIncrementalPermissionDialogProps) {
  return (
    <SharedIncrementalPermissionDialog
      open={open}
      onOpenChange={onOpenChange}
      tier={tier}
      returnUrl={returnUrl}
      providerLabel="Microsoft"
      getAuthUrl={getIncrementalAuthUrl}
      tierToLabel={msTierToLabel}
      tierToDescription={msTierToDescription}
    />
  );
}
