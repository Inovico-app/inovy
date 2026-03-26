"use client";

import { Button } from "@/components/ui/button";
import { XIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

const DISMISSED_KEY = "inovy:notetaker-guidance-dismissed";

export function NotetakerGuidanceBanner() {
  const t = useTranslations("meetings");
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(DISMISSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // localStorage may be unavailable
    }
  };

  return (
    <div className="relative rounded-lg border border-primary/20 bg-primary/5 p-4 mb-6">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={handleDismiss}
        aria-label={t("notetakerBanner.dismissAriaLabel")}
      >
        <XIcon className="h-3.5 w-3.5" />
      </Button>
      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <SparklesIcon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">{t("notetakerBanner.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("notetakerBanner.description")}
          </p>
        </div>
      </div>
    </div>
  );
}
