import { AIInsightService } from "@/server/services/ai-insight.service";

export async function getAiInsightsStep(recordingId: string) {
  "use step";

  return await AIInsightService.getInsightByTypeInternal(
    recordingId,
    "transcription"
  );
}

