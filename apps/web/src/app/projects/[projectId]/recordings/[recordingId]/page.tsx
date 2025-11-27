import type { ActionResult } from "@/lib/action-errors";
import type { ConsentParticipant } from "@/server/db/schema/consent";
import { AIInsightService } from "@/server/services/ai-insight.service";
import { ConsentService } from "@/server/services/consent.service";
import { TaskService } from "@/server/services/task.service";
import { ArrowLeftIcon, CalendarIcon, ClockIcon, FileIcon } from "lucide-react";
import { ok } from "neverthrow";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Button } from "../../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card";
import { ConsentManager } from "../../../../../features/recordings/components/consent-manager";
import { EnhancedSummarySection } from "../../../../../features/recordings/components/enhanced-summary-section";
import { RecordingDetailActionsDropdown } from "../../../../../features/recordings/components/recording-detail-actions-dropdown";
import { RecordingDetailStatus } from "../../../../../features/recordings/components/recording-detail-status";
import { RecordingPlayerWrapper } from "../../../../../features/recordings/components/recording-player-wrapper";
import { ReprocessButton } from "../../../../../features/recordings/components/reprocess-button";
import { ReprocessingStatusIndicator } from "../../../../../features/recordings/components/reprocessing-status-indicator";
import { TranscriptionSection } from "../../../../../features/recordings/components/transcription/transcription-section";
import { TaskCard } from "../../../../../features/tasks/components/task-card-with-edit";
import { getAuthSession } from "../../../../../lib/auth";
import { getCachedSummary } from "../../../../../server/cache/summary.cache";
import { ProjectService } from "../../../../../server/services/project.service";
import { RecordingService } from "../../../../../server/services/recording.service";

interface RecordingDetailPageProps {
  params: Promise<{ projectId: string; recordingId: string }>;
}

async function RecordingDetail({ params }: RecordingDetailPageProps) {
  const { projectId, recordingId } = await params;

  // Get auth session for organization ID
  const authResult = await getAuthSession();
  const organizationId =
    authResult.isOk() && authResult.value.organization
      ? authResult.value.organization.id
      : null;

  // Fetch recording, project, summary, tasks, transcription insight, and consent in parallel
  const [
    recordingResult,
    projectResult,
    summary,
    tasksResult,
    transcriptionInsightResult,
    consentParticipantsResult,
  ] = await Promise.all([
    RecordingService.getRecordingById(recordingId),
    ProjectService.getProjectById(projectId),
    getCachedSummary(recordingId),
    TaskService.getTasksByRecordingId(recordingId),
    AIInsightService.getInsightByTypeInternal(recordingId, "transcription"),
    organizationId
      ? ConsentService.getConsentParticipants(recordingId, organizationId)
      : Promise.resolve(ok([]) as ActionResult<ConsentParticipant[]>),
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

  // Extract transcription insight data
  const transcriptionInsight = transcriptionInsightResult.isOk()
    ? transcriptionInsightResult.value
    : null;

  // Extract consent participants
  const consentParticipants = consentParticipantsResult.isOk()
    ? consentParticipantsResult.value
    : [];

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
            <RecordingDetailActionsDropdown
              recording={recording}
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
                recordingId={recording.id}
                isEncrypted={recording.isEncrypted}
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
          redactedTranscriptionText={recording.redactedTranscriptionText}
          utterances={transcriptionInsight?.utterances ?? undefined}
          isTranscriptionManuallyEdited={
            recording.isTranscriptionManuallyEdited
          }
          transcriptionLastEditedById={recording.transcriptionLastEditedById}
          transcriptionLastEditedAt={recording.transcriptionLastEditedAt}
          speakersDetected={transcriptionInsight?.speakersDetected ?? undefined}
          confidence={transcriptionInsight?.confidenceScore ?? undefined}
          knowledgeUsed={
            transcriptionInsight?.content &&
            typeof transcriptionInsight.content === "object" &&
            "knowledgeUsed" in transcriptionInsight.content &&
            Array.isArray(transcriptionInsight.content.knowledgeUsed)
              ? (transcriptionInsight.content.knowledgeUsed as string[])
              : undefined
          }
        />

        {/* AI-Generated Summary */}
        <EnhancedSummarySection
          recordingId={recordingId}
          summary={summary}
          transcriptionStatus={recording.transcriptionStatus}
        />

        {/* Consent Management */}
        <ConsentManager
          recordingId={recording.id}
          initialParticipants={consentParticipants}
          organizerEmail={recording.createdById}
        />

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

