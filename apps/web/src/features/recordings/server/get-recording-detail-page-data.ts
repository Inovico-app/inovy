import { getBetterAuthSession } from "@/lib/better-auth-session";
import { getCachedInsightByTypeInternal } from "@/server/cache/ai-insight.cache";
import { getCachedConsentParticipants } from "@/server/cache/consent.cache";
import { getCachedRecordingById } from "@/server/cache/recording.cache";
import type { SummaryResult } from "@/server/cache/summary.cache";
import { getCachedSummary } from "@/server/cache/summary.cache";
import { getCachedTasksByRecordingId } from "@/server/cache/task.cache";
import type { ConsentParticipant } from "@/server/db/schema/consent";
import type { AIInsightDto } from "@/server/dto/ai-insight.dto";
import type { RecordingDto } from "@/server/dto/recording.dto";
import type { TaskDto } from "@/server/dto/task.dto";

interface GetRecordingDetailPageDataInput {
  recordingId: string;
}

interface RecordingDetailPageData {
  recording: RecordingDto | null;
  summary: SummaryResult | null;
  tasks: TaskDto[];
  transcriptionInsights: AIInsightDto | null;
  participantsConsent: ConsentParticipant[];
  organizationId: string;
}

/**
 * Server-side loader for the recording detail page.
 * Returns `null` when the user is not authenticated or has no organization.
 */
export async function getRecordingDetailPageData(
  input: GetRecordingDetailPageDataInput,
): Promise<RecordingDetailPageData | null> {
  const { recordingId } = input;

  const authResult = await getBetterAuthSession();
  if (authResult.isErr() || !authResult.value.organization) {
    return null;
  }

  const organizationId = authResult.value.organization.id;

  // Fetch recording first to get language for summary cache lookup
  const recording = await getCachedRecordingById(recordingId);

  const [summary, tasks, transcriptionInsights, participantsConsent] =
    await Promise.all([
      getCachedSummary(recordingId, recording?.language ?? "nl"),
      getCachedTasksByRecordingId(recordingId, organizationId),
      getCachedInsightByTypeInternal(recordingId, "transcription"),
      getCachedConsentParticipants(recordingId, organizationId),
    ]);

  return {
    recording,
    summary,
    tasks,
    transcriptionInsights,
    participantsConsent,
    organizationId,
  };
}
