"use client";

import { RefreshCwIcon, AlertCircleIcon, CheckCircle2Icon } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { useReprocessingStatus } from "../hooks/use-reprocessing-status";
import type { WorkflowStatus } from "@/server/db/schema/recordings";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("recordings");
  const { reprocessingStatus, isPolling } = useReprocessingStatus({
    recordingId,
    enabled: initialWorkflowStatus !== "completed",
  });

  // Determine the current status to display
  const workflowStatus =
    reprocessingStatus?.workflowStatus ?? initialWorkflowStatus;
  const isReprocessing = reprocessingStatus?.isReprocessing ?? false;

  // Don't show indicator if workflow is idle or completed (and not reprocessing)
  if (
    workflowStatus === "idle" ||
    (workflowStatus === "completed" && !isReprocessing)
  ) {
    return null;
  }

  // Show reprocessing status
  if (workflowStatus === "running" || isReprocessing) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="secondary" className="flex items-center gap-2">
          <RefreshCwIcon className="h-3 w-3 animate-spin" />
          <span>
            {isReprocessing
              ? t("status.reprocessing")
              : t("status.processingGeneric")}
          </span>
        </Badge>
        {isPolling && (
          <span className="text-xs text-muted-foreground">
            {t("status.updatesAutomatically")}
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
      t("status.processingFailed");

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="destructive" className="flex items-center gap-2">
          <AlertCircleIcon className="h-3 w-3" />
          <span>{t("status.failed")}</span>
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
        <Badge
          variant="default"
          className="flex items-center gap-2 bg-green-600"
        >
          <CheckCircle2Icon className="h-3 w-3" />
          <span>{t("status.reprocessingComplete")}</span>
        </Badge>
      </div>
    );
  }

  return null;
}
