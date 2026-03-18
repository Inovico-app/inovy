"use client";

import { Button } from "@/components/ui/button";
import { XIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";

const DISMISSED_KEY = "inovy:notetaker-guidance-dismissed";

export function NotetakerGuidanceBanner() {
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
        aria-label="Dismiss guidance"
      >
        <XIcon className="h-3.5 w-3.5" />
      </Button>
      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <SparklesIcon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">
            Get AI-powered notes for your meetings
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Click &quot;Add Notetaker&quot; on any upcoming meeting, or paste a
            meeting link above to get automatic transcripts, summaries, and
            action items.
          </p>
        </div>
      </div>
    </div>
  );
}
