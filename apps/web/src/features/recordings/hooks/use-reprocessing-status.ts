"use client";

import { useEffect, useState, useCallback } from "react";
import { getReprocessingStatusAction } from "../actions/reprocess-recording";
import type { WorkflowStatus } from "@/server/db/schema/recordings";

interface UseReprocessingStatusOptions {
  recordingId: string;
  enabled?: boolean;
  pollingInterval?: number; // in milliseconds
  onStatusChange?: (status: {
    isReprocessing: boolean;
    status?: string;
    errorMessage?: string | null;
  }) => void;
}

interface ReprocessingStatus {
  isReprocessing: boolean;
  workflowStatus: WorkflowStatus;
  workflowError: string | null;
  status?: string;
  startedAt?: Date;
  errorMessage?: string | null;
  lastReprocessedAt?: Date | null;
}

interface UseReprocessingStatusReturn {
  reprocessingStatus: ReprocessingStatus | null;
  isPolling: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useReprocessingStatus({
  recordingId,
  enabled = true,
  pollingInterval = 3000, // Default: 3 seconds
  onStatusChange,
}: UseReprocessingStatusOptions): UseReprocessingStatusReturn {
  const [reprocessingStatus, setReprocessingStatus] =
    useState<ReprocessingStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const result = await getReprocessingStatusAction({ recordingId });

      if (result?.data) {
        const newStatus: ReprocessingStatus = {
          isReprocessing: result.data.isReprocessing,
          workflowStatus: result.data.workflowStatus,
          workflowError: result.data.workflowError,
          status: result.data.status,
          startedAt: result.data.startedAt,
          errorMessage: result.data.errorMessage,
          lastReprocessedAt: result.data.lastReprocessedAt,
        };

        setReprocessingStatus(newStatus);

        // Notify of status change
        onStatusChange?.({
          isReprocessing: newStatus.isReprocessing,
          status: newStatus.status,
          errorMessage: newStatus.errorMessage,
        });

        // Stop polling if not reprocessing
        if (!newStatus.isReprocessing) {
          setIsPolling(false);
        }
      }

      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to check reprocessing status"
      );
    }
  }, [recordingId, onStatusChange]);

  useEffect(() => {
    // Don't poll if disabled
    if (!enabled) {
      setIsPolling(false);
      return;
    }

    // Only poll if reprocessing is active or we haven't checked yet
    const shouldPoll = !reprocessingStatus || reprocessingStatus.isReprocessing;

    if (!shouldPoll) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);

    // Initial check
    void fetchStatus();

    // Set up polling interval
    const pollingIntervalId = setInterval(() => {
      void fetchStatus();
    }, pollingInterval);

    return () => {
      clearInterval(pollingIntervalId);
      setIsPolling(false);
    };
  }, [enabled, pollingInterval, reprocessingStatus, fetchStatus]);

  return {
    reprocessingStatus,
    isPolling,
    error,
    refetch: fetchStatus,
  };
}

