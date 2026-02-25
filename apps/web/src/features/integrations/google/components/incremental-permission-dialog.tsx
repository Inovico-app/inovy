"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck } from "lucide-react";
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
 * Shown when a user triggers a feature that requires an OAuth scope
 * they haven't granted yet. Explains why the additional permission is
 * needed and redirects to Google's incremental consent screen.
 */
export function IncrementalPermissionDialog({
  open,
  onOpenChange,
  tier,
  returnUrl,
}: IncrementalPermissionDialogProps) {
  function handleGrant() {
    const redirect = returnUrl ?? window.location.pathname;
    const authUrl = getIncrementalAuthUrl(tier, redirect);
    window.location.href = authUrl;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Additional permission required</DialogTitle>
          <DialogDescription>
            This feature needs access to{" "}
            <span className="font-medium text-foreground">
              {tierToLabel(tier)}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <div className="rounded-lg border p-3">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {tierToDescription(tier)}
            </p>
          </div>

          <div className="rounded-lg bg-muted/60 p-3 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              You will be redirected to Google to grant only this permission.
              Your existing access stays unchanged and you can revoke it any
              time.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Button onClick={handleGrant}>Grant permission</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

