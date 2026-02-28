"use client";

import { RefreshCwIcon, AlertCircleIcon, CheckCircle2Icon } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { useReprocessingStatus } from "../hooks/use-reprocessing-status";
import type { WorkflowStatus } from "@/server/db/schema/recordings";

interface ReprocessingStatusIndicatorProps {
  recordingId: string;
  initialWorkflowStatus: WorkflowStatus;
  className?: string;
}

export function ReprocessingStatusIndicator({
  recordingId,
  initialWorkflowStatus,
  className = "",
}: ReprocessingStatusIndicatorProps) {
  const { reprocessingStatus, isPolling } = useReprocessingStatus({
    recordingId,
    enabled: initialWorkflowStatus !== "completed",
  });

  // Determine the current status to display
  const workflowStatus = reprocessingStatus?.workflowStatus ?? initialWorkflowStatus;
  const isReprocessing = reprocessingStatus?.isReprocessing ?? false;

  // Don't show indicator if workflow is idle or completed (and not reprocessing)
  if (workflowStatus === "idle" || (workflowStatus === "completed" && !isReprocessing)) {
    return null;
  }

  // Show reprocessing status
  if (workflowStatus === "running" || isReprocessing) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="secondary" className="flex items-center gap-2">
          <RefreshCwIcon className="h-3 w-3 animate-spin" />
          <span>{isReprocessing ? "Reprocessing..." : "Processing..."}</span>
        </Badge>
        {isPolling && (
          <span className="text-xs text-muted-foreground">
            Updates automatically
          </span>
        )}
      </div>
    );
  }

  // Show failed status
  if (workflowStatus === "failed") {
    const errorMessage =
      reprocessingStatus?.errorMessage ??
      reprocessingStatus?.workflowError ??
      "Processing failed";

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="destructive" className="flex items-center gap-2">
          <AlertCircleIcon className="h-3 w-3" />
          <span>Failed</span>
        </Badge>
        <span className="text-xs text-destructive" title={errorMessage}>
          {errorMessage}
        </span>
      </div>
    );
  }

  // Show completed status briefly
  if (workflowStatus === "completed" && reprocessingStatus?.lastReprocessedAt) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="default" className="flex items-center gap-2 bg-green-600">
          <CheckCircle2Icon className="h-3 w-3" />
          <span>Reprocessing Complete</span>
        </Badge>
      </div>
    );
  }

  return null;
}

