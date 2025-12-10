"use client";

import { formatDateShort } from "@/lib/formatters/date-formatters";
import { formatDurationCompact } from "@/lib/formatters/duration-formatters";
import { formatFileSizePrecise } from "@/lib/formatters/file-size-formatters";
import { ClockIcon, FileAudioIcon, FileVideoIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Checkbox } from "../../../components/ui/checkbox";
import type { RecordingDto } from "../../../server/dto/recording.dto";
import { useRecordingStatus } from "../hooks/use-recording-status-query";
import { StatusBadge } from "./status-badge";

interface RecordingCardWithStatusProps {
  recording: RecordingDto;
  selectable?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (recordingId: string, selected: boolean) => void;
}

export function RecordingCardWithStatus({
  recording,
  selectable = false,
  isSelected = false,
  onSelectionChange,
}: RecordingCardWithStatusProps) {
  const previousStatusRef = useRef(recording.transcriptionStatus);

  const { status } = useRecordingStatus({
    recordingId: recording.id,
    initialStatus: recording.transcriptionStatus,
    enabled:
      recording.transcriptionStatus === "pending" ||
      recording.transcriptionStatus === "processing",
    onStatusChange: (newStatus) => {
      if (
        newStatus === "completed" &&
        previousStatusRef.current !== "completed"
      ) {
        toast.success("Transcription completed", {
          description: `Recording "${recording.title}" has been processed`,
        });
      } else if (
        newStatus === "failed" &&
        previousStatusRef.current !== "failed"
      ) {
        toast.error("Transcription failed", {
          description: `Failed to process "${recording.title}"`,
        });
      }
      previousStatusRef.current = newStatus;
    },
  });

  // Update ref when recording changes
  useEffect(() => {
    previousStatusRef.current = recording.transcriptionStatus;
  }, [recording.transcriptionStatus]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("video/")) {
      return <FileVideoIcon className="h-5 w-5 text-muted-foreground" />;
    }
    return <FileAudioIcon className="h-5 w-5 text-muted-foreground" />;
  };

  const handleCheckboxChange = (checked: boolean) => {
    onSelectionChange?.(recording.id, checked);
  };

  const cardContent = (
    <Card
      className={`hover:border-primary/50 transition-colors ${
        selectable ? "" : "cursor-pointer"
      } ${isSelected ? "border-primary" : ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          {selectable && (
            <div className="pt-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={handleCheckboxChange}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="flex items-start justify-between gap-4 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">
                {recording.title}
              </CardTitle>
              {recording.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {recording.description}
                </p>
              )}
            </div>
            <StatusBadge status={status} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ClockIcon className="h-4 w-4" />
            <span>{formatDateShort(recording.recordingDate)}</span>
          </div>
          {recording.duration && (
            <div className="flex items-center gap-1.5">
              {getFileIcon(recording.fileMimeType)}
              <span>{formatDurationCompact(recording.duration)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-xs">
              {formatFileSizePrecise(recording.fileSize)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Wrap with Link only if not in selectable mode
  if (selectable) {
    return <div>{cardContent}</div>;
  }

  return (
    <Link
      href={
        `/projects/${recording.projectId}/recordings/${recording.id}` as Route
      }
      className="block"
    >
      {cardContent}
    </Link>
  );
}

