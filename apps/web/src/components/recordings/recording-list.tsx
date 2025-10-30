import { ClockIcon, FileAudioIcon, FileVideoIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { RecordingDto } from "../../server/dto";
import { UploadRecordingModal } from "./upload-recording-modal";
import { RecordingService } from "../../server/services/recording.service";

interface RecordingListProps {
  projectId: string;
  searchQuery?: string;
}

export async function RecordingList({ projectId, searchQuery }: RecordingListProps) {
  const recordingsResult = await RecordingService.getRecordingsByProjectId(projectId, {
    search: searchQuery,
  });

  if (recordingsResult.isErr()) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">Failed to load recordings</p>
        <p className="text-sm text-muted-foreground">{recordingsResult.error.message}</p>
      </div>
    );
  }

  const recordings = recordingsResult.value;

  if (recordings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          {searchQuery ? "No recordings found matching your search" : "No recordings yet"}
        </p>
        <UploadRecordingModal
          projectId={projectId}
          trigger={<Button variant="outline">Upload Your First Recording</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recordings.map((recording) => (
        <RecordingCard key={recording.id} recording={recording} />
      ))}
    </div>
  );
}

interface RecordingCardProps {
  recording: RecordingDto;
}

function RecordingCard({ recording }: RecordingCardProps) {
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pending", variant: "outline" as const },
      processing: { label: "Processing", variant: "default" as const },
      completed: { label: "Completed", variant: "secondary" as const },
      failed: { label: "Failed", variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    );
  };

  return (
    <Link
      href={`/projects/${recording.projectId}/recordings/${recording.id}` as Route}
      className="block"
    >
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{recording.title}</CardTitle>
              {recording.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {recording.description}
                </p>
              )}
            </div>
            {getStatusBadge(recording.transcriptionStatus)}
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
              <span className="text-xs">{formatFileSize(recording.fileSize)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
