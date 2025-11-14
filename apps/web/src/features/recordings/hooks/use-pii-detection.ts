import {
  applyAutomaticRedactionsAction,
  detectPIIAction,
} from "@/features/recordings/actions/redact-pii";
import type { PIIDetection } from "@/server/services/pii-detection.service";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

interface UsePIIDetectionOptions {
  onAutomaticRedactionsApplied?: () => void;
}

export function usePIIDetection(
  recordingId: string,
  transcriptionText: string | null,
  options?: UsePIIDetectionOptions
) {
  const [detections, setDetections] = useState<PIIDetection[]>([]);

  const { execute: detectPII, isExecuting: isDetectingPII } = useAction(
    detectPIIAction,
    {
      onSuccess: ({ data }) => {
        if (data) {
          setDetections(data);
          toast.success(`${data.length} potentiële PII items gevonden`);
        }
      },
      onError: () => {
        toast.error("PII detectie mislukt");
      },
    }
  );

  const {
    execute: applyAutomaticRedactions,
    isExecuting: isApplyingAutomatic,
  } = useAction(applyAutomaticRedactionsAction, {
    onSuccess: ({ data }) => {
      toast.success(`${data?.length ?? 0} automatische redacties toegepast`);
      options?.onAutomaticRedactionsApplied?.();
    },
    onError: () => {
      toast.error("Automatische redacties toepassen mislukt");
    },
  });

  const handleDetectPII = () => {
    if (!transcriptionText) {
      toast.error("Geen transcriptie beschikbaar");
      return;
    }
    detectPII({ recordingId, minConfidence: 0.5 });
  };

  const handleApplyAutomaticRedactions = () => {
    if (!transcriptionText) {
      toast.error("Geen transcriptie beschikbaar");
      return;
    }
    applyAutomaticRedactions({ recordingId, minConfidence: 0.5 });
  };

  return {
    detections,
    setDetections,
    isDetectingPII,
    isApplyingAutomatic,
    handleDetectPII,
    handleApplyAutomaticRedactions,
  };
}

