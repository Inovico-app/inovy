import type { RecordingDto } from "@/server/dto";
import {
  CalendarIcon,
  ClockIcon,
  FileAudioIcon,
  MoreVerticalIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { EditRecordingModal } from "./edit-recording-modal";
import { MoveRecordingDialog } from "./move-recording-dialog";

interface RecordingCardProps {
  recording: RecordingDto;
  projectId: string;
}

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  completed: {
    label: "Completed",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
} as const;

export function RecordingCard({ recording, projectId }: RecordingCardProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "Unknown";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const statusConfig = STATUS_CONFIG[recording.transcriptionStatus];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href={
                `/projects/${projectId}/recordings/${recording.id}` as Route
              }
              className="hover:underline"
            >
              <CardTitle className="truncate">{recording.title}</CardTitle>
            </Link>
            {recording.description && (
              <CardDescription className="line-clamp-2 mt-1">
                {recording.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusConfig.className}>
              {statusConfig.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <EditRecordingModal
                  recording={recording}
                  variant="ghost"
                  triggerContent={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      Edit
                    </DropdownMenuItem>
                  }
                />
                <MoveRecordingDialog
                  recording={recording}
                  currentProjectId={projectId}
                  variant="ghost"
                  triggerContent={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      Move to Project
                    </DropdownMenuItem>
                  }
                />
                <DropdownMenuSeparator />
                <DropdownMenuItem>Archive</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>{formatDate(recording.recordingDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileAudioIcon className="h-4 w-4" />
            <span>{formatFileSize(recording.fileSize)}</span>
          </div>
          {recording.duration && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClockIcon className="h-4 w-4" />
              <span>{formatDuration(recording.duration)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            Uploaded {formatDate(recording.createdAt)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

