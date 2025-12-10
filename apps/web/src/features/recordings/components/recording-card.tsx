import { formatDateShort } from "@/lib/formatters/date-formatters";
import { formatDurationCompact } from "@/lib/formatters/duration-formatters";
import { formatFileSizePrecise } from "@/lib/formatters/file-size-formatters";
import type { RecordingDto } from "@/server/dto/recording.dto";
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
  projectName?: string;
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

export function RecordingCard({
  recording,
  projectId,
  projectName,
}: RecordingCardProps) {
  const statusConfig = STATUS_CONFIG[recording.transcriptionStatus];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {projectName && (
                <Badge variant="outline" className="text-xs">
                  {projectName}
                </Badge>
              )}
            </div>
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
                <DropdownMenuItem disabled>
                  Archive (Coming Soon)
                </DropdownMenuItem>
                <DropdownMenuItem disabled className="text-destructive">
                  Delete (Coming Soon)
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
            <span>{formatDateShort(recording.recordingDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileAudioIcon className="h-4 w-4" />
            <span>{formatFileSizePrecise(recording.fileSize)}</span>
          </div>
          {recording.duration && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClockIcon className="h-4 w-4" />
              <span>{formatDurationCompact(recording.duration)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            Uploaded {formatDateShort(recording.createdAt)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

