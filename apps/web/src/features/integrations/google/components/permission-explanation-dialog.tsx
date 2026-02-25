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
import { Calendar, Eye, HardDrive, Mail, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { SCOPE_TIERS, type ScopeTier } from "../lib/scope-constants";
import { tierToDescription, tierToLabel } from "../lib/scope-utils";

const TIER_ICONS: Record<ScopeTier, ReactNode> = {
  base: <Calendar className="h-5 w-5 text-sky-500" />,
  calendarWrite: <Calendar className="h-5 w-5 text-emerald-500" />,
  gmail: <Mail className="h-5 w-5 text-rose-400" />,
  drive: <HardDrive className="h-5 w-5 text-amber-500" />,
};

interface PermissionExplanationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tiers: ScopeTier[];
  redirectUrl: string;
}

export function PermissionExplanationDialog({
  open,
  onOpenChange,
  tiers,
  redirectUrl,
}: PermissionExplanationDialogProps) {
  const scopes = tiers.flatMap((t) => [...SCOPE_TIERS[t]]);
  const scopeParam = tiers.join(",");
  const connectUrl = `/api/integrations/google/authorize?scopes=${encodeURIComponent(scopeParam)}&redirect=${encodeURIComponent(redirectUrl)}`;

  function handleConnect() {
    window.location.href = connectUrl;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] gap-0 p-0 overflow-hidden">
        {/* Header strip */}
        <div className="bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/30 px-6 pt-6 pb-4 border-b">
          <DialogHeader className="gap-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-background shadow-sm border">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            </div>
            <DialogTitle className="text-center text-lg">
              Connect Google Account
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              Inovy needs limited access to your Google account. Here is exactly
              what we are requesting and why.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Permission items */}
        <div className="px-6 py-5 space-y-3">
          {tiers.map((tier) => (
            <div
              key={tier}
              className="flex items-start gap-3 rounded-lg border p-3"
            >
              <div className="mt-0.5 shrink-0">{TIER_ICONS[tier]}</div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {tierToLabel(tier)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {tierToDescription(tier)}
                </p>
              </div>
              <Eye className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
            </div>
          ))}
        </div>

        {/* Privacy assurance */}
        <div className="mx-6 mb-5 rounded-lg bg-muted/60 p-3 flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Inovy will <strong className="text-foreground">never</strong> read
            email content, modify files, or share your data with third parties.
            You can revoke access at any time from Settings.
          </p>
        </div>

        {/* Actions */}
        <DialogFooter className="px-6 pb-6 pt-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button onClick={handleConnect} className="flex-1 sm:flex-none">
            Continue with Google
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

