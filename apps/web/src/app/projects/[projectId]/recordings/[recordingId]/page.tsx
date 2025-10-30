import {
  CalendarIcon,
  ClockIcon,
  FileIcon,
  ArrowLeftIcon,
  PencilIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";
import { Suspense } from "react";
import { Button } from "../../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card";
import { Badge } from "../../../../../components/ui/badge";
import { RecordingService } from "../../../../../server/services/recording.service";
import { ProjectService } from "../../../../../server/services/project.service";
import { EditRecordingModal } from "../../../../../components/recordings/edit-recording-modal";

interface RecordingDetailPageProps {
  params: Promise<{ projectId: string; recordingId: string }>;
}

async function RecordingDetail({ params }: RecordingDetailPageProps) {
  const { projectId, recordingId } = await params;

  // Fetch recording and project in parallel
  const [recordingResult, projectResult] = await Promise.all([
    RecordingService.getRecordingById(recordingId),
    ProjectService.getProjectById(projectId),
  ]);

  if (recordingResult.isErr() || projectResult.isErr()) {
    notFound();
  }

  const recording = recordingResult.value;
  const project = projectResult.value;

  if (!recording || !project) {
    notFound();
  }

  // Verify recording belongs to this project
  if (recording.projectId !== projectId) {
    notFound();
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Unknown";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pending", variant: "outline" as const },
      processing: { label: "Processing", variant: "default" as const },
      completed: { label: "Completed", variant: "secondary" as const },
      failed: { label: "Failed", variant: "destructive" as const },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    );
  };

  const isVideo = recording.fileMimeType.startsWith("video/");
  const isAudio = recording.fileMimeType.startsWith("audio/");

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/projects" className="hover:text-foreground transition-colors">
            Projects
          </Link>
          <span>/</span>
          <Link
            href={`/projects/${projectId}` as Route}
            className="hover:text-foreground transition-colors"
          >
            {project.name}
          </Link>
          <span>/</span>
          <Link
            href={`/projects/${projectId}` as Route}
            className="hover:text-foreground transition-colors"
          >
            Recordings
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate">
            {recording.title}
          </span>
        </nav>

        {/* Header */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-foreground truncate">
              {recording.title}
            </h1>
            {recording.description && (
              <p className="text-lg text-muted-foreground mt-2">
                {recording.description}
              </p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            {getStatusBadge(recording.transcriptionStatus)}
            <EditRecordingModal recording={recording} />
          </div>
        </div>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Recording Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Date:</span>
                <span className="text-sm">{formatDate(recording.recordingDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Duration:</span>
                <span className="text-sm">{formatDuration(recording.duration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">File size:</span>
                <span className="text-sm">{formatFileSize(recording.fileSize)}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Format:</span>
                <span className="text-sm">{recording.fileName.split(".").pop()?.toUpperCase()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media Player */}
        <Card>
          <CardHeader>
            <CardTitle>Playback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              {isVideo && (
                <video
                  controls
                  className="w-full rounded-lg"
                  preload="metadata"
                  controlsList="nodownload"
                >
                  <source src={recording.fileUrl} type={recording.fileMimeType} />
                  Your browser does not support the video player.
                </video>
              )}
              {isAudio && (
                <audio
                  controls
                  className="w-full"
                  preload="metadata"
                  controlsList="nodownload"
                >
                  <source src={recording.fileUrl} type={recording.fileMimeType} />
                  Your browser does not support the audio player.
                </audio>
              )}
              {!isVideo && !isAudio && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Playback not supported for this file type</p>
                  <Button variant="outline" className="mt-4" asChild>
                    <a href={recording.fileUrl} download={recording.fileName}>
                      Download File
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transcription */}
        <Card>
          <CardHeader>
            <CardTitle>Transcription</CardTitle>
          </CardHeader>
          <CardContent>
            {recording.transcriptionStatus === "completed" &&
            recording.transcriptionText ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap">{recording.transcriptionText}</p>
              </div>
            ) : recording.transcriptionStatus === "processing" ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Transcription in progress...</p>
                <p className="text-sm mt-2">
                  This may take a few minutes depending on the recording length.
                </p>
              </div>
            ) : recording.transcriptionStatus === "failed" ? (
              <div className="text-center py-8 text-destructive">
                <p>Transcription failed</p>
                <p className="text-sm mt-2">
                  There was an error processing this recording. Please try uploading again.
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Transcription pending</p>
                <p className="text-sm mt-2">
                  Processing will begin shortly.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Insights Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>AI-Generated Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>AI summary will appear here once transcription is complete</p>
              <p className="text-sm mt-2">Coming soon in a future update</p>
            </div>
          </CardContent>
        </Card>

        {/* Action Items Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Extracted Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>Action items will appear here once AI processing is complete</p>
              <p className="text-sm mt-2">Coming soon in a future update</p>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href={`/projects/${projectId}` as Route}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Project
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default async function RecordingDetailPage({
  params,
}: RecordingDetailPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="h-8 bg-muted rounded animate-pulse" />
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-48 bg-muted rounded animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
            <div className="h-48 bg-muted rounded animate-pulse" />
          </div>
        </div>
      }
    >
      <RecordingDetail params={params} />
    </Suspense>
  );
}

