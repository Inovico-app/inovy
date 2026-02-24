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
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useConsentBanner } from "../hooks/use-consent-banner";

interface ConsentBannerProps {
  isOpen: boolean;
  onConsentGranted: () => void;
  onConsentDenied: () => void;
}

export function ConsentBanner({
  isOpen,
  onConsentGranted,
  onConsentDenied,
}: ConsentBannerProps) {
  // Use local state to ensure dialog closes immediately when consent is granted
  const [localIsOpen, setLocalIsOpen] = useState(isOpen);

  // Sync local state with prop
  useEffect(() => {
    setLocalIsOpen(isOpen);
  }, [isOpen]);

  const {
    hasRead,
    setHasRead,
    handleOpenChange,
    handleConsentGranted,
  } = useConsentBanner({
    isOpen: localIsOpen,
    onConsentGranted,
    onConsentDenied,
  });

  // Handle consent granted - close dialog immediately
  const handleConsentGrantedClick = () => {
    // Call the handler which sets the ref flag and notifies parent
    handleConsentGranted();
    // Close dialog immediately using local state
    setLocalIsOpen(false);
    // Also call handleOpenChange to ensure hook state is updated
    handleOpenChange(false);
  };

  // Handle dialog open/close changes
  const handleDialogOpenChange = (open: boolean) => {
    setLocalIsOpen(open);
    handleOpenChange(open);
  };

  return (
    <Dialog open={localIsOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Recording Consent Required</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Before starting the recording, you must obtain consent from all
            participants. This is required for compliance with GDPR and HIPAA
            regulations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="font-medium mb-2">Consent Requirements:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>
                All participants must explicitly consent to being recorded
              </li>
              <li>Consent can be revoked at any time</li>
              <li>Consent status will be tracked and audited</li>
            </ul>
          </div>

          <div className="flex items-start gap-2 rounded-lg border p-3">
            <input
              type="checkbox"
              id="consent-read"
              checked={hasRead}
              onChange={(e) => setHasRead(e.target.checked)}
              className="mt-1"
            />
            <label
              htmlFor="consent-read"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              I confirm that I have obtained explicit consent from all
              participants before starting this recording.
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onConsentDenied}>
            Cancel
          </Button>
          <Button
            onClick={handleConsentGrantedClick}
            disabled={!hasRead}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />I Have Consent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

