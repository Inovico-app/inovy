import { err, ok, type Result } from "neverthrow";
import { ActionErrors, type ActionError } from "../../lib/action-errors";
import { logger } from "../../lib/logger";
import { RecordingsQueries } from "../data-access/recordings.queries";
import { TranscriptionHistoryQueries } from "../data-access/transcription-history.queries";
import type { UpdateTranscriptionInput } from "../validation/recordings/update-transcription";

/**
 * Transcription Edit Service
 * Handles business logic for transcription editing with version history
 */
export class TranscriptionEditService {
  /**
   * Update transcription content with version history tracking
   */
  static async updateTranscription(
    input: UpdateTranscriptionInput,
    userId: string
  ): Promise<Result<{ success: boolean; versionNumber: number }, ActionError>> {
    logger.info("Updating transcription", {
      component: "TranscriptionEditService.updateTranscription",
      recordingId: input.recordingId,
      userId,
    });

    // Get the current recording to store in history
    const recordingResult = await RecordingsQueries.selectRecordingById(
      input.recordingId
    );

    if (recordingResult.isErr()) {
      logger.error("Failed to fetch recording", {
        component: "TranscriptionEditService.updateTranscription",
        error: recordingResult.error,
        recordingId: input.recordingId,
      });

      return err(
        ActionErrors.internal(
          "Failed to fetch recording",
          new Error(recordingResult.error),
          "TranscriptionEditService.updateTranscription"
        )
      );
    }

    const recording = recordingResult.value;

    if (!recording) {
      logger.warn("Recording not found", {
        component: "TranscriptionEditService.updateTranscription",
        recordingId: input.recordingId,
      });

      return err(
        ActionErrors.notFound(
          "Recording not found",
          "TranscriptionEditService.updateTranscription"
        )
      );
    }

    // Check if there's existing transcription content to save in history
    if (!recording.transcriptionText) {
      logger.warn("No existing transcription to edit", {
        component: "TranscriptionEditService.updateTranscription",
        recordingId: input.recordingId,
      });

      return err(
        ActionErrors.validation("No existing transcription to edit", {
          context: "TranscriptionEditService.updateTranscription",
        })
      );
    }

    // Get the latest version number
    const versionResult =
      await TranscriptionHistoryQueries.getLatestVersionNumber(
        input.recordingId
      );

    if (versionResult.isErr()) {
      logger.error("Failed to get latest version number", {
        component: "TranscriptionEditService.updateTranscription",
        error: versionResult.error,
        recordingId: input.recordingId,
      });

      return err(
        ActionErrors.internal(
          "Failed to get version history",
          versionResult.error,
          "TranscriptionEditService.updateTranscription"
        )
      );
    }

    const currentVersion = versionResult.value;
    const newVersion = currentVersion + 1;

    // Save current transcription to history before updating
    const historyResult =
      await TranscriptionHistoryQueries.insertTranscriptionHistory({
        recordingId: input.recordingId,
        content: input.content, // Save the NEW content as the new version
        editedById: userId,
        versionNumber: newVersion,
        changeDescription: input.changeDescription,
      });

    if (historyResult.isErr()) {
      logger.error("Failed to save transcription history", {
        component: "TranscriptionEditService.updateTranscription",
        error: historyResult.error,
        recordingId: input.recordingId,
      });

      return err(
        ActionErrors.internal(
          "Failed to save transcription history",
          historyResult.error,
          "TranscriptionEditService.updateTranscription"
        )
      );
    }

    // Update the recording with new transcription
    const updateResult =
      await RecordingsQueries.updateRecordingTranscriptionWithEdit(
        input.recordingId,
        input.content,
        userId
      );

    if (updateResult.isErr()) {
      logger.error("Failed to update recording transcription", {
        component: "TranscriptionEditService.updateTranscription",
        error: updateResult.error,
        recordingId: input.recordingId,
      });

      return err(
        ActionErrors.internal(
          "Failed to update transcription",
          new Error(updateResult.error),
          "TranscriptionEditService.updateTranscription"
        )
      );
    }

    logger.info("Successfully updated transcription", {
      component: "TranscriptionEditService.updateTranscription",
      recordingId: input.recordingId,
      versionNumber: newVersion,
    });

    return ok({ success: true, versionNumber: newVersion });
  }

  /**
   * Get transcription version history for a recording
   */
  static async getTranscriptionHistory(
    recordingId: string
  ): Promise<
    Result<
      Array<{
        id: string;
        versionNumber: number;
        content: string;
        editedById: string;
        editedAt: Date;
        changeDescription: string | null;
      }>,
      ActionError
    >
  > {
    logger.info("Fetching transcription history", {
      component: "TranscriptionEditService.getTranscriptionHistory",
      recordingId,
    });

    const historyResult =
      await TranscriptionHistoryQueries.selectTranscriptionHistoryByRecordingId(
        recordingId
      );

    if (historyResult.isErr()) {
      logger.error("Failed to fetch transcription history", {
        component: "TranscriptionEditService.getTranscriptionHistory",
        error: historyResult.error,
        recordingId,
      });

      return err(
        ActionErrors.internal(
          "Failed to fetch transcription history",
          historyResult.error,
          "TranscriptionEditService.getTranscriptionHistory"
        )
      );
    }

    const history = historyResult.value.map((entry) => ({
      id: entry.id,
      versionNumber: entry.versionNumber,
      content: entry.content,
      editedById: entry.editedById,
      editedAt: entry.editedAt,
      changeDescription: entry.changeDescription,
    }));

    logger.info("Successfully fetched transcription history", {
      component: "TranscriptionEditService.getTranscriptionHistory",
      recordingId,
      count: history.length,
    });

    return ok(history);
  }

  /**
   * Restore a specific version of transcription
   */
  static async restoreTranscriptionVersion(
    recordingId: string,
    versionNumber: number,
    userId: string
  ): Promise<
    Result<{ success: boolean; newVersionNumber: number }, ActionError>
  > {
    logger.info("Restoring transcription version", {
      component: "TranscriptionEditService.restoreTranscriptionVersion",
      recordingId,
      versionNumber,
      userId,
    });

    // Get the version to restore
    const versionResult =
      await TranscriptionHistoryQueries.selectTranscriptionVersion(
        recordingId,
        versionNumber
      );

    if (versionResult.isErr()) {
      logger.error("Failed to fetch transcription version", {
        component: "TranscriptionEditService.restoreTranscriptionVersion",
        error: versionResult.error,
        recordingId,
        versionNumber,
      });

      return err(
        ActionErrors.internal(
          "Failed to fetch transcription version",
          versionResult.error,
          "TranscriptionEditService.restoreTranscriptionVersion"
        )
      );
    }

    const version = versionResult.value;

    if (!version) {
      logger.warn("Transcription version not found", {
        component: "TranscriptionEditService.restoreTranscriptionVersion",
        recordingId,
        versionNumber,
      });

      return err(
        ActionErrors.notFound(
          "Transcription version not found",
          "TranscriptionEditService.restoreTranscriptionVersion"
        )
      );
    }

    // Use the update method to restore (which will create a new version)
    const result = await this.updateTranscription(
      {
        recordingId,
        content: version.content,
        changeDescription: `Restored from version ${versionNumber}`,
      },
      userId
    );

    if (result.isErr()) {
      return err(result.error);
    }

    return ok({
      success: result.value.success,
      newVersionNumber: result.value.versionNumber,
    });
  }
}

