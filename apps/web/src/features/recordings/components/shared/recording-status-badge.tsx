"use client";

import { Badge } from "@/components/ui/badge";
import type { RecordingStatus } from "@/features/recordings/core/recording-session.types";

interface RecordingStatusBadgeProps {
  status: RecordingStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  RecordingStatus,
  { label: string; className: string }
> = {
  idle: {
    label: "Inactief",
    className: "bg-muted text-muted-foreground",
  },
  initializing: {
    label: "Initialiseren...",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  recording: {
    label: "Opnemen",
    className: "bg-red-500/15 text-red-700 dark:text-red-400 animate-pulse",
  },
  paused: {
    label: "Gepauzeerd",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  stopping: {
    label: "Stoppen...",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  finalizing: {
    label: "Afronden...",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  complete: {
    label: "Voltooid",
    className: "bg-green-500/10 text-green-700 dark:text-green-400",
  },
  error: {
    label: "Fout",
    className: "bg-destructive/10 text-destructive",
  },
};

export function RecordingStatusBadge({
  status,
  className,
}: RecordingStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant="outline"
      className={`border-transparent ${config.className} ${className ?? ""}`}
      aria-label={`Status: ${config.label}`}
    >
      {status === "recording" && (
        <span className="mr-1 inline-block size-1.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
      )}
      {config.label}
    </Badge>
  );
}
