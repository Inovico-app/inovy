"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRecordingStatus } from "../../../hooks/use-recording-status";
import type { RecordingStatus } from "../../../server/db/schema/recordings";
import { StatusBadge } from "./status-badge";

interface RecordingDetailStatusProps {
  recordingId: string;
  initialStatus: RecordingStatus;
}

export function RecordingDetailStatus({
  recordingId,
  initialStatus,
}: RecordingDetailStatusProps) {
  const router = useRouter();
  const previousStatusRef = useRef(initialStatus);

  const { status, isPolling } = useRecordingStatus({
    recordingId,
    initialStatus,
    enabled: initialStatus === "pending" || initialStatus === "processing",
    onStatusChange: (newStatus) => {
      if (
        newStatus === "completed" &&
        previousStatusRef.current !== "completed"
      ) {
        toast.success("Transcription completed", {
          description: "The recording has been successfully processed",
        });
        // Refresh the page to show the transcription
        router.refresh();
      } else if (
        newStatus === "failed" &&
        previousStatusRef.current !== "failed"
      ) {
        toast.error("Transcription failed", {
          description: "There was an error processing this recording",
        });
        router.refresh();
      }
      previousStatusRef.current = newStatus;
    },
  });

  useEffect(() => {
    previousStatusRef.current = initialStatus;
  }, [initialStatus]);

  return (
    <div className="flex items-center gap-2">
      <StatusBadge status={status} />
      {isPolling && (
        <span className="text-xs text-muted-foreground">
          Checking status...
        </span>
      )}
    </div>
  );
}

