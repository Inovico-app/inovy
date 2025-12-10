import {
  createRedactionAction,
  deleteRedactionAction,
  getRedactionsAction,
} from "@/features/recordings/actions/redact-pii";
import type { Redaction } from "@/server/db/schema/redactions";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";

export function useRedactions(
  recordingId: string,
  onRedactionsChange?: () => void
) {
  const [redactions, setRedactions] = useState<Redaction[]>([]);

  const { execute: getRedactions, isExecuting: isLoadingRedactions } =
    useAction(getRedactionsAction, {
      onSuccess: ({ data }) => {
        if (data) {
          setRedactions(data);
        }
      },
      onError: () => {
        toast.error("Redacties laden mislukt");
      },
    });

  // Use useEffectEvent to create a stable reference for refresh function
  const refreshRedactions = useEffectEvent(() => {
    if (recordingId) {
      getRedactions({ recordingId });
    }
  });

  const { execute: createRedaction, isExecuting: isCreatingRedaction } =
    useAction(createRedactionAction, {
      onSuccess: () => {
        toast.success("Redactie aangemaakt");
        refreshRedactions();
        onRedactionsChange?.();
      },
      onError: () => {
        toast.error("Redactie aanmaken mislukt");
      },
    });

  const { execute: deleteRedaction, isExecuting: isDeletingRedaction } =
    useAction(deleteRedactionAction, {
      onSuccess: () => {
        toast.success("Redactie verwijderd");
        refreshRedactions();
        onRedactionsChange?.();
      },
      onError: () => {
        toast.error("Redactie verwijderen mislukt");
      },
    });

  useEffect(() => {
    if (recordingId) {
      getRedactions({ recordingId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingId]);

  const handleCreateRedaction = (
    originalText: string,
    startIndex: number,
    endIndex: number
  ) => {
    createRedaction({
      recordingId,
      redactionType: "pii",
      originalText,
      startIndex,
      endIndex,
      detectedBy: "manual",
    });
  };

  const handleRemoveRedaction = (redactionId: string) => {
    deleteRedaction({ redactionId });
  };

  const isRedacted = (startIndex: number, endIndex: number) => {
    return redactions.some(
      (r) => r.startIndex === startIndex && r.endIndex === endIndex
    );
  };

  return {
    redactions,
    isLoadingRedactions,
    isCreatingRedaction,
    isDeletingRedaction,
    handleCreateRedaction,
    handleRemoveRedaction,
    isRedacted,
    refreshRedactions,
  };
}

