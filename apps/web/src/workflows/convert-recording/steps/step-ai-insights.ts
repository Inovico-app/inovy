import type { AIInsightDto } from "@/server/dto/ai-insight.dto";
import { AIInsightService } from "@/server/services/ai-insight.service";
import type { WorkflowResult } from "@/workflows/lib/workflow-result";
import { failure, success } from "@/workflows/lib/workflow-result";

export async function getAiInsightsStep(
  recordingId: string
): Promise<WorkflowResult<AIInsightDto | null>> {
  "use step";

  const result = await AIInsightService.getInsightByTypeInternal(
    recordingId,
    "transcription"
  );

  if (result.isOk()) {
    return success(result.value);
  }

  return failure(result.error);
}

