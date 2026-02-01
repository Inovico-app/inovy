"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { SystemAudioCompatibility } from "@/features/recordings/lib/system-audio-detection";

interface BrowserCompatibilityWarningProps {
  compatibility: SystemAudioCompatibility;
}

export function BrowserCompatibilityWarning({
  compatibility,
}: BrowserCompatibilityWarningProps) {
  // Only show warning if system audio is not supported
  if (compatibility.isAudioSupported) {
    return null;
  }

  return (
    <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">
        System Audio Not Supported
      </AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-200 mt-1">
        <p className="mb-2">{compatibility.message}</p>
        <p className="text-sm">
          <strong>Supported browsers:</strong> Chrome 74+, Edge 79+, Opera 62+
        </p>
        <p className="text-sm mt-1">
          You can still record using your microphone only.
        </p>
      </AlertDescription>
    </Alert>
  );
}
