"use client";

import { useEffect, useState } from "react";
import { getRecordingStatusAction } from "../features/recordings/actions/get-recording-status";
import type { RecordingStatus } from "../server/db/schema/recordings";

interface UseRecordingStatusOptions {
  recordingId: string;
  initialStatus: RecordingStatus;
  enabled?: boolean;
  pollingInterval?: number; // in milliseconds
  onStatusChange?: (newStatus: RecordingStatus) => void;
}

interface UseRecordingStatusReturn {
  status: RecordingStatus;
  isPolling: boolean;
  error: string | null;
}

export function useRecordingStatus({
  recordingId,
  initialStatus,
  enabled = true,
  pollingInterval = 5000, // Default: 5 seconds
  onStatusChange,
}: UseRecordingStatusOptions): UseRecordingStatusReturn {
  const [status, setStatus] = useState<RecordingStatus>(initialStatus);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't poll if disabled or already in terminal state
    if (!enabled || status === "completed" || status === "failed") {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);

    const checkStatus = async () => {
      try {
        const result = await getRecordingStatusAction({ recordingId });

        if (result?.data) {
          const newStatus = result.data.transcriptionStatus;

          if (newStatus !== status) {
            setStatus(newStatus);
            onStatusChange?.(newStatus);
          }

          // Stop polling if reached terminal state
          if (newStatus === "completed" || newStatus === "failed") {
            setIsPolling(false);
          }
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to check status");
      }
    };

    // Initial check
    void checkStatus();

    // Set up polling interval
    const pollingIntervalId = setInterval(() => {
      void checkStatus();
    }, pollingInterval);

    return () => {
      clearInterval(pollingIntervalId);
      setIsPolling(false);
    };
  }, [recordingId, status, enabled, pollingInterval, onStatusChange]);

  return {
    status,
    isPolling,
    error,
  };
}

