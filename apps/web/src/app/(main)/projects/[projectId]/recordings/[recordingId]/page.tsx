import { Button } from "@/components/ui/button";
import { ConsentManager } from "@/features/recordings/components/consent-manager";
import { EnhancedSummarySection } from "@/features/recordings/components/enhanced-summary-section";
import { RecordingDetailActionsDropdown } from "@/features/recordings/components/recording-detail-actions-dropdown";
import { RecordingDetailStatus } from "@/features/recordings/components/recording-detail-status";
import { RecordingActionItemsCard } from "@/features/recordings/components/recording-detail/recording-action-items-card";
import { RecordingDetailBreadcrumb } from "@/features/recordings/components/recording-detail/recording-detail-breadcrumb";
import { RecordingDetailSkeleton } from "@/features/recordings/components/recording-detail/recording-detail-skeleton";
import { RecordingInfoCard } from "@/features/recordings/components/recording-detail/recording-info-card";
import { RecordingMediaPlayer } from "@/features/recordings/components/recording-detail/recording-media-player";
import { ReprocessButton } from "@/features/recordings/components/reprocess-button";
import { ReprocessingStatusIndicator } from "@/features/recordings/components/reprocessing-status-indicator";
import { TranscriptionSection } from "@/features/recordings/components/transcription/transcription-section";
import { getRecordingDetailPageData } from "@/features/recordings/server/get-recording-detail-page-data";
import type { AIInsightDto } from "@/server/dto/ai-insight.dto";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface RecordingDetailPageProps {
  params: Promise<{ projectId: string; recordingId: string }>;
}

async function RecordingDetail({ params }: RecordingDetailPageProps) {
  const { projectId, recordingId } = await params;

  const data = await getRecordingDetailPageData({ recordingId });
  if (!data) {
    notFound();
  }

  const {
    recording,
    summary,
    tasks,
    transcriptionInsights,
    participantsConsent,
  } = data;

  if (!recording) {
    notFound();
  }

  const knowledgeUsed = extractUsedKnowledge(transcriptionInsights);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <RecordingDetailBreadcrumb
          projectId={projectId}
          recordingId={recordingId}
        />

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

        <RecordingInfoCard recording={recording} />
        <RecordingMediaPlayer recording={recording} />

        {/* Transcription */}
        <TranscriptionSection
          recording={recording}
          knowledgeUsed={knowledgeUsed ?? []}
          transcriptionInsights={transcriptionInsights}
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
          initialParticipants={participantsConsent}
          organizerEmail={recording.createdById}
        />

        <RecordingActionItemsCard recording={recording} tasks={tasks} />

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href={`/projects/${projectId}`}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Project
            </Link>
          </Button>
        </div>
      </div>
      ;
    </div>
  );
}

/**
 *
 * @param transcriptionInsights - The transcription insights to extract the knowledge used from.
 * Extract the knowledgeUsed array from transcriptionInsights if it exists and is valid.
 * We need to safely navigate the nested structure and validate the type because
 * transcriptionInsights.content is dynamically typed and may not always contain knowledgeUsed.
 * @returns The knowledge used or undefined if it doesn't exist.
 */
function extractUsedKnowledge(transcriptionInsights: AIInsightDto | null) {
  return transcriptionInsights?.content &&
    typeof transcriptionInsights.content === "object" &&
    "knowledgeUsed" in transcriptionInsights.content &&
    Array.isArray(transcriptionInsights.content.knowledgeUsed)
    ? (transcriptionInsights.content.knowledgeUsed as string[])
    : undefined;
}

export default async function RecordingDetailPage({
  params,
}: RecordingDetailPageProps) {
  return (
    <Suspense fallback={<RecordingDetailSkeleton />}>
      <RecordingDetail params={params} />
    </Suspense>
  );
}

