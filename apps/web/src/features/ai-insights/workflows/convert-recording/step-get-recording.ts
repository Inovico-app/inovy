import { RecordingService } from "@/server/services";
import { err, ok } from "neverthrow";

export async function getRecordingStep(recordingId: string) {
  "use step";

  const result = await RecordingService.getRecordingById(recordingId);

  if (result.isErr()) {
    return err(result.error);
  }

  return ok(result.value ?? null);
}

