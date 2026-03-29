"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
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

function isStatusActive(status: ReprocessingStatus | null): boolean {
  return (
    !status || status.isReprocessing || status.workflowStatus === "running"
  );
}

export function useReprocessingStatus({
  recordingId,
  enabled = true,
  pollingInterval = 3000, // Default: 3 seconds
  onStatusChange,
}: UseReprocessingStatusOptions): UseReprocessingStatusReturn {
  const { data, error, isRefetching, refetch } = useQuery({
    queryKey: queryKeys.recordings.reprocessingStatus(recordingId),
    queryFn: async () => {
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

        // Notify of status change
        onStatusChange?.({
          isReprocessing: newStatus.isReprocessing,
          status: newStatus.status,
          errorMessage: newStatus.errorMessage,
        });

        return newStatus;
      }

      throw new Error("Failed to fetch reprocessing status");
    },
    enabled,
    refetchInterval: (query) => {
      const currentStatus = query.state.data;

      // Stop polling once we reach a terminal state
      if (!isStatusActive(currentStatus ?? null)) {
        return false;
      }

      return pollingInterval;
    },
    refetchIntervalInBackground: false,
  });

  const reprocessingStatus = data ?? null;
  const isPolling =
    enabled && isRefetching && isStatusActive(reprocessingStatus);

  return {
    reprocessingStatus,
    isPolling,
    error: error
      ? error instanceof Error
        ? error.message
        : "Failed to check reprocessing status"
      : null,
    refetch: async () => {
      await refetch();
    },
  };
}
