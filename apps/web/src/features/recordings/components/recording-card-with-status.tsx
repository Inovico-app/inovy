"use client";

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
import { useRecordingStatus } from "../../../hooks/use-recording-status";
import type { RecordingDto } from "../../../server/dto";
import { StatusBadge } from "./status-badge";

interface RecordingCardWithStatusProps {
  recording: RecordingDto;
}

export function RecordingCardWithStatus({
  recording,
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("video/")) {
      return <FileVideoIcon className="h-5 w-5 text-muted-foreground" />;
    }
    return <FileAudioIcon className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <Link
      href={
        `/projects/${recording.projectId}/recordings/${recording.id}` as Route
      }
      className="block"
    >
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
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
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ClockIcon className="h-4 w-4" />
              <span>{formatDate(recording.recordingDate)}</span>
            </div>
            {recording.duration && (
              <div className="flex items-center gap-1.5">
                {getFileIcon(recording.fileMimeType)}
                <span>{formatDuration(recording.duration)}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-xs">
                {formatFileSize(recording.fileSize)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

