import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  FileIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card";
import { ArchiveRecordingDialog } from "../../../../../features/recordings/components/archive-recording-dialog";
import { DeleteRecordingDialog } from "../../../../../features/recordings/components/delete-recording-dialog";
import { EditRecordingModal } from "../../../../../features/recordings/components/edit-recording-modal";
import { EditSummaryDialog } from "../../../../../features/recordings/components/edit-summary-dialog";
import { SummaryVersionHistoryDialog } from "../../../../../features/recordings/components/summary-version-history-dialog";
import { RecordingDetailStatus } from "../../../../../features/recordings/components/recording-detail-status";
import { ReprocessButton } from "../../../../../features/recordings/components/reprocess-button";
import { ReprocessingStatusIndicator } from "../../../../../features/recordings/components/reprocessing-status-indicator";
import { TranscriptionSection } from "../../../../../features/recordings/components/transcription-section";
import { RecordingPlayerWrapper } from "../../../../../features/recordings/components/recording-player-wrapper";
import { TaskCard } from "../../../../../features/tasks/components/task-card-with-edit";
import { getCachedSummary } from "../../../../../server/cache/summary.cache";
import { TasksQueries } from "../../../../../server/data-access/tasks.queries";
import { ProjectService } from "../../../../../server/services/project.service";
import { RecordingService } from "../../../../../server/services/recording.service";

interface RecordingDetailPageProps {
  params: Promise<{ projectId: string; recordingId: string }>;
}

async function RecordingDetail({ params }: RecordingDetailPageProps) {
  const { projectId, recordingId } = await params;

  // Fetch recording, project, summary, and tasks in parallel
  const [recordingResult, projectResult, summary, tasksResult] =
    await Promise.all([
      RecordingService.getRecordingById(recordingId),
      ProjectService.getProjectById(projectId),
      getCachedSummary(recordingId),
      TasksQueries.getTasksByRecordingId(recordingId),
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

  const tasks = tasksResult.isOk() ? tasksResult.value : [];

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

  const isVideo = recording.fileMimeType.startsWith("video/");
  const isAudio = recording.fileMimeType.startsWith("audio/");

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/projects"
            className="hover:text-foreground transition-colors"
          >
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
          <div className="flex gap-2 items-center flex-wrap">
            <RecordingDetailStatus
              recordingId={recording.id}
              initialStatus={recording.transcriptionStatus}
            />
            <ReprocessButton
              recordingId={recording.id}
              recordingTitle={recording.title}
              workflowStatus={recording.workflowStatus}
              isArchived={recording.status === "archived"}
            />
            <EditRecordingModal recording={recording} />
            <ArchiveRecordingDialog
              recordingId={recording.id}
              recordingTitle={recording.title}
              isArchived={recording.status === "archived"}
            />
            <DeleteRecordingDialog
              recordingId={recording.id}
              recordingTitle={recording.title}
              projectId={projectId}
            />
          </div>
        </div>

        {/* Reprocessing Status Indicator */}
        <ReprocessingStatusIndicator
          recordingId={recording.id}
          initialWorkflowStatus={recording.workflowStatus}
        />

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
                <span className="text-sm">
                  {formatDate(recording.recordingDate)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Duration:</span>
                <span className="text-sm">
                  {formatDuration(recording.duration)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  File size:
                </span>
                <span className="text-sm">
                  {formatFileSize(recording.fileSize)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FileIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Format:</span>
                <span className="text-sm">
                  {recording.fileName.split(".").pop()?.toUpperCase()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media Player */}
        <Card id="player">
          <CardHeader>
            <CardTitle>Playback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              <RecordingPlayerWrapper
                fileUrl={recording.fileUrl}
                fileMimeType={recording.fileMimeType}
                fileName={recording.fileName}
                isVideo={isVideo}
                isAudio={isAudio}
              />
            </div>
          </CardContent>
        </Card>

        {/* Transcription */}
        <TranscriptionSection
          recordingId={recording.id}
          recordingTitle={recording.title}
          transcriptionStatus={recording.transcriptionStatus}
          transcriptionText={recording.transcriptionText}
          isTranscriptionManuallyEdited={
            recording.isTranscriptionManuallyEdited
          }
          transcriptionLastEditedById={recording.transcriptionLastEditedById}
          transcriptionLastEditedAt={recording.transcriptionLastEditedAt}
        />

        {/* AI-Generated Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>AI-Generated Summary</CardTitle>
                {summary?.isManuallyEdited && (
                  <Badge variant="secondary">Edited</Badge>
                )}
              </div>
              {summary && (
                <div className="flex items-center gap-2">
                  <SummaryVersionHistoryDialog recordingId={recordingId} />
                  <EditSummaryDialog
                    recordingId={recordingId}
                    summary={summary.content}
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {summary ? (
              <div className="space-y-6">
                {/* Main Topics */}
                {summary.content.hoofdonderwerpen &&
                  summary.content.hoofdonderwerpen.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2">
                        Main Topics
                      </h3>
                      <ul className="space-y-1">
                        {summary.content.hoofdonderwerpen.map((topic, idx) => (
                          <li
                            key={idx}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="text-primary mt-1">•</span>
                            <span>{topic}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Decisions */}
                {summary.content.beslissingen &&
                  summary.content.beslissingen.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Decisions</h3>
                      <ul className="space-y-1">
                        {summary.content.beslissingen.map((decision, idx) => (
                          <li
                            key={idx}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <CheckCircle2Icon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{decision}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Speaker Contributions */}
                {summary.content.sprekersBijdragen &&
                  summary.content.sprekersBijdragen.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2">
                        Speaker Contributions
                      </h3>
                      <div className="space-y-3">
                        {summary.content.sprekersBijdragen.map(
                          (speaker, idx) => (
                            <div key={idx}>
                              <p className="font-medium text-sm mb-1">
                                {speaker.spreker}
                              </p>
                              <ul className="space-y-1 ml-4">
                                {speaker.bijdragen.map((contribution, cIdx) => (
                                  <li
                                    key={cIdx}
                                    className="text-sm text-muted-foreground"
                                  >
                                    • {contribution}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Important Quotes */}
                {summary.content.belangrijkeQuotes &&
                  summary.content.belangrijkeQuotes.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2">
                        Important Quotes
                      </h3>
                      <div className="space-y-2">
                        {summary.content.belangrijkeQuotes.map((quote, idx) => (
                          <div
                            key={idx}
                            className="border-l-2 border-primary pl-3 py-1"
                          >
                            <p className="text-sm italic text-muted-foreground">
                              &quot;{quote.quote}&quot;
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              — {quote.spreker}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Confidence Score */}
                {summary.confidence && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>AI Confidence:</span>
                      <Badge variant="outline">
                        {(summary.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            ) : recording.transcriptionStatus === "completed" ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No summary available yet</p>
                <p className="text-sm mt-2">
                  Summary generation may still be in progress
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Summary will be generated after transcription completes</p>
                <p className="text-sm mt-2">
                  Please wait for the transcription to finish
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Extracted Action Items */}
        <Card>
          <CardHeader>
            <CardTitle>Extracted Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length > 0 ? (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : recording.transcriptionStatus === "completed" ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No action items extracted yet</p>
                <p className="text-sm mt-2">
                  Task extraction may still be in progress
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>
                  Action items will be extracted after transcription completes
                </p>
                <p className="text-sm mt-2">
                  Please wait for the transcription to finish
                </p>
              </div>
            )}
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

