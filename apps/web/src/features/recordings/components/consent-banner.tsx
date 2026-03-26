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
import { useConsentBanner } from "../hooks/use-consent-banner";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("recordings");
  const { hasRead, setHasRead, handleOpenChange, handleConsentGranted } =
    useConsentBanner({
      isOpen,
      onConsentGranted,
      onConsentDenied,
    });

  // Handle consent granted - close dialog immediately
  const handleConsentGrantedClick = () => {
    // Call the handler which sets the ref flag and notifies parent
    handleConsentGranted();
    // Close dialog via hook handler to ensure state is updated
    handleOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>{t("consent.consentRequired")}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {t("consent.consentDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="font-medium mb-2">
              {t("consent.consentRequirements")}
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>{t("consent.consentReq1")}</li>
              <li>{t("consent.consentReq2")}</li>
              <li>{t("consent.consentReq3")}</li>
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
              {t("consent.consentConfirm")}
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
            <CheckCircle2 className="h-4 w-4" />
            {t("consent.iHaveConsent")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
