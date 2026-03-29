import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { ConsentManager } from "@/features/recordings/components/consent-manager";

export async function generateMetadata({
  params,
}: RecordingDetailPageProps): Promise<Metadata> {
  const { recordingId } = await params;
  const recording = await RecordingsQueries.selectRecordingById(recordingId);
  if (recording) {
    return { title: recording.title };
  }
  return { title: "Recording" };
}
import { EnhancedSummarySection } from "@/features/recordings/components/enhanced-summary-section";
import { RecordingDetailActionsDropdown } from "@/features/recordings/components/recording-detail-actions-dropdown";
import { RecordingDetailStatus } from "@/features/recordings/components/recording-detail-status";
import { AudioTranscriptSyncWrapper } from "@/features/recordings/components/recording-detail/audio-transcript-sync-wrapper";
import { RecordingActionItemsCard } from "@/features/recordings/components/recording-detail/recording-action-items-card";
import { RecordingDetailBreadcrumb } from "@/features/recordings/components/recording-detail/recording-detail-breadcrumb";
import { RecordingDetailSkeleton } from "@/features/recordings/components/recording-detail/recording-detail-skeleton";
import { RecordingInfoCard } from "@/features/recordings/components/recording-detail/recording-info-card";
import { RecordingMediaPlayer } from "@/features/recordings/components/recording-detail/recording-media-player";
import { ReprocessButton } from "@/features/recordings/components/reprocess-button";
import { ReprocessingStatusIndicator } from "@/features/recordings/components/reprocessing-status-indicator";
import { TranscriptionSection } from "@/features/recordings/components/transcription/transcription-section";
import { getRecordingDetailPageData } from "@/features/recordings/server/get-recording-detail-page-data";
import { KnowledgeContextIndicator } from "@/features/knowledge-base/components/knowledge-context-indicator";
import { FeedbackQueries } from "@/server/data-access/feedback.queries";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { getCachedKnowledgeDocuments } from "@/server/cache/knowledge-base.cache";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import type { AIInsightDto } from "@/server/dto/ai-insight.dto";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface RecordingDetailPageProps {
  params: Promise<{ projectId: string; recordingId: string }>;
}

async function RecordingDetail({ params }: RecordingDetailPageProps) {
  const { projectId, recordingId } = await params;

  // Start project document fetch immediately (only needs projectId from params)
  const projectDocumentsPromise = getCachedKnowledgeDocuments(
    "project",
    projectId,
  );

  const [data, authResult] = await Promise.all([
    getRecordingDetailPageData({ recordingId }),
    getBetterAuthSession(),
  ]);

  if (!data) {
    notFound();
  }

  const {
    recording,
    summary,
    tasks,
    transcriptionInsights,
    participantsConsent,
    organizationId,
  } = data;

  if (!recording) {
    notFound();
  }

  const user = authResult.isOk() ? authResult.value.user : null;

  // Now that we have organizationId, fetch org documents + feedback in parallel
  const [existingFeedback, projectDocumentsRaw, orgDocumentsRaw] =
    await Promise.all([
      user
        ? FeedbackQueries.getByUserAndRecording(user.id, recordingId)
        : Promise.resolve([]),
      projectDocumentsPromise,
      getCachedKnowledgeDocuments("organization", organizationId),
    ]);

  const t = await getTranslations("projects");
  const knowledgeUsed = extractUsedKnowledge(transcriptionInsights);

  const toSummary = (d: (typeof projectDocumentsRaw)[number]) => ({
    id: d.id,
    title: d.title,
    processingStatus: d.processingStatus,
  });
  const projectDocuments = projectDocumentsRaw.map(toSummary);
  const orgDocuments = orgDocumentsRaw.map(toSummary);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <RecordingDetailBreadcrumb
          projectId={projectId}
          organizationId={organizationId}
          recordingTitle={recording.title}
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

        <AudioTranscriptSyncWrapper>
          <RecordingMediaPlayer recording={recording} />

          {/* Transcription */}
          <TranscriptionSection
            recording={recording}
            knowledgeUsed={knowledgeUsed ?? []}
            transcriptionInsights={transcriptionInsights}
          />
        </AudioTranscriptSyncWrapper>

        {/* Knowledge Context */}
        <KnowledgeContextIndicator
          projectDocuments={projectDocuments}
          orgDocuments={orgDocuments}
          projectId={projectId}
        />

        {/* AI-Generated Summary */}
        <EnhancedSummarySection
          recordingId={recordingId}
          summary={summary}
          transcriptionStatus={recording.transcriptionStatus}
          existingFeedback={existingFeedback.map((f) => ({
            type: f.type,
            rating: f.rating,
            comment: f.comment,
          }))}
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
          <Button
            variant="outline"
            render={<Link href={`/projects/${projectId}`} />}
            nativeButton={false}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            {t("backToProject")}
          </Button>
        </div>
      </div>
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
