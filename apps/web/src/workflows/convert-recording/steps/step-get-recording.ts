import type { RecordingDto } from "@/server/dto/recording.dto";
import { RecordingService } from "@/server/services/recording.service";
import type { WorkflowResult } from "@/workflows/lib/workflow-result";
import { failure, success } from "@/workflows/lib/workflow-result";

export async function getRecordingStep(
  recordingId: string
): Promise<WorkflowResult<RecordingDto | null>> {
  "use step";

  const result = await RecordingService.getRecordingById(recordingId);

  if (result.isErr()) {
    return failure(result.error);
  }

  return success(result.value ?? null);
}

