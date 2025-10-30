"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import type { RecordingStatus } from "../../../server/db/schema/recordings";
import { getRecordingStatusAction } from "../actions/get-recording-status";

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
  const { data, error, isRefetching } = useQuery({
    queryKey: queryKeys.recordings.status(recordingId),
    queryFn: async () => {
      const result = await getRecordingStatusAction({ recordingId });

      if (result?.data) {
        return result.data.transcriptionStatus;
      }

      throw new Error("Failed to fetch recording status");
    },
    initialData: initialStatus,
    enabled,
    refetchInterval: (query) => {
      const currentStatus = query.state.data;

      // Stop polling if reached terminal state
      if (currentStatus === "completed" || currentStatus === "failed") {
        return false;
      }

      return pollingInterval;
    },
    refetchIntervalInBackground: false,
  });

  // Trigger callback when status changes
  const status = data ?? initialStatus;

  // Use a ref-like approach through query options to track previous status
  if (onStatusChange && status !== initialStatus) {
    onStatusChange(status);
  }

  const isPolling =
    enabled && isRefetching && status !== "completed" && status !== "failed";

  return {
    status,
    isPolling,
    error: error
      ? error instanceof Error
        ? error.message
        : "Failed to check status"
      : null,
  };
}

