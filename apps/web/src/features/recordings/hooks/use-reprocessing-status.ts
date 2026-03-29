"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { queryKeys } from "@/lib/query-keys";
import { getReprocessingStatusAction } from "../actions/reprocess-recording";
import type { WorkflowStatus } from "@/server/db/schema/recordings";

interface UseReprocessingStatusOptions {
  recordingId: string;
  enabled?: boolean;
  pollingInterval?: number;
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
  pollingInterval = 3000,
  onStatusChange,
}: UseReprocessingStatusOptions): UseReprocessingStatusReturn {
  const prevStatusRef = useRef<ReprocessingStatus | null>(null);

  const { data, error, isFetching, isRefetching, refetch } = useQuery({
    queryKey: queryKeys.recordings.reprocessingStatus(recordingId),
    queryFn: async () => {
      const result = await getReprocessingStatusAction({ recordingId });

      if (result?.data) {
        return {
          isReprocessing: result.data.isReprocessing,
          workflowStatus: result.data.workflowStatus,
          workflowError: result.data.workflowError,
          status: result.data.status,
          startedAt: result.data.startedAt,
          errorMessage: result.data.errorMessage,
          lastReprocessedAt: result.data.lastReprocessedAt,
        } satisfies ReprocessingStatus;
      }

      throw new Error("Failed to fetch reprocessing status");
    },
    enabled,
    refetchInterval: (query) => {
      const currentStatus = query.state.data;
      if (!isStatusActive(currentStatus ?? null)) {
        return false;
      }
      return pollingInterval;
    },
    refetchIntervalInBackground: false,
  });

  const reprocessingStatus = data ?? null;

  useEffect(() => {
    if (!reprocessingStatus) return;
    const prev = prevStatusRef.current;
    if (prev?.isReprocessing !== reprocessingStatus.isReprocessing) {
      onStatusChange?.({
        isReprocessing: reprocessingStatus.isReprocessing,
        status: reprocessingStatus.status,
        errorMessage: reprocessingStatus.errorMessage,
      });
    }
    prevStatusRef.current = reprocessingStatus;
  }, [reprocessingStatus, onStatusChange]);

  const isPolling =
    enabled &&
    (isFetching || isRefetching) &&
    isStatusActive(reprocessingStatus);

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
