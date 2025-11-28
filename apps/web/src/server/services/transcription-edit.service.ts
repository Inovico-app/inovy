import { err, ok } from "neverthrow";
import { logger } from "../../lib/logger";
import { assertOrganizationAccess } from "../../lib/rbac/organization-isolation";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
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
    userId: string,
    organizationId: string
  ): Promise<ActionResult<{ success: boolean; versionNumber: number }>> {
    logger.info("Updating transcription", {
      component: "TranscriptionEditService.updateTranscription",
      recordingId: input.recordingId,
      userId,
    });

    try {
      // Get the current recording to store in history
      const recording = await RecordingsQueries.selectRecordingById(
        input.recordingId
      );

      if (!recording) {
        logger.warn("Recording not found", {
          component: "TranscriptionEditService.updateTranscription",
          recordingId: input.recordingId,
        });

        return err(
          ActionErrors.notFound(
            "Recording",
            "TranscriptionEditService.updateTranscription"
          )
        );
      }

      // Verify recording belongs to organization
      try {
        assertOrganizationAccess(
          recording.organizationId,
          organizationId,
          "TranscriptionEditService.updateTranscription"
        );
      } catch {
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
      const currentVersion =
        await TranscriptionHistoryQueries.getLatestVersionNumber(
          input.recordingId
        );
      const newVersion = currentVersion + 1;

      // Save current transcription to history before updating
      await TranscriptionHistoryQueries.insertTranscriptionHistory({
        recordingId: input.recordingId,
        content: input.content,
        editedById: userId,
        versionNumber: newVersion,
        changeDescription: input.changeDescription,
      });

      // Update the recording with new transcription
      await RecordingsQueries.updateRecordingTranscriptionWithEdit(
        input.recordingId,
        input.content,
        userId
      );

      logger.info("Successfully updated transcription", {
        component: "TranscriptionEditService.updateTranscription",
        recordingId: input.recordingId,
        versionNumber: newVersion,
      });

      return ok({ success: true, versionNumber: newVersion });
    } catch (error) {
      logger.error("Failed to update transcription", {
        component: "TranscriptionEditService.updateTranscription",
        error,
        recordingId: input.recordingId,
      });

      return err(
        ActionErrors.internal(
          "Failed to update transcription",
          error as Error,
          "TranscriptionEditService.updateTranscription"
        )
      );
    }
  }

  /**
   * Get transcription version history for a recording
   */
  static async getTranscriptionHistory(
    recordingId: string,
    organizationId: string
  ): Promise<
    ActionResult<
      Array<{
        id: string;
        versionNumber: number;
        content: string;
        editedById: string;
        editedAt: Date;
        changeDescription: string | null;
      }>
    >
  > {
    logger.info("Fetching transcription history", {
      component: "TranscriptionEditService.getTranscriptionHistory",
      recordingId,
    });

    try {
      // Verify recording belongs to organization
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        return err(
          ActionErrors.notFound(
            "Recording",
            "TranscriptionEditService.getTranscriptionHistory"
          )
        );
      }

      try {
        assertOrganizationAccess(
          recording.organizationId,
          organizationId,
          "TranscriptionEditService.getTranscriptionHistory"
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Recording not found",
            "TranscriptionEditService.getTranscriptionHistory"
          )
        );
      }

      const history =
        await TranscriptionHistoryQueries.selectTranscriptionHistoryByRecordingId(
          recordingId
        );

      const mapped = history.map((entry) => ({
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
        count: mapped.length,
      });

      return ok(mapped);
    } catch (error) {
      logger.error("Failed to fetch transcription history", {
        component: "TranscriptionEditService.getTranscriptionHistory",
        error,
        recordingId,
      });

      return err(
        ActionErrors.internal(
          "Failed to fetch transcription history",
          error as Error,
          "TranscriptionEditService.getTranscriptionHistory"
        )
      );
    }
  }

  /**
   * Restore a specific version of transcription
   */
  static async restoreTranscriptionVersion(
    recordingId: string,
    versionNumber: number,
    userId: string,
    organizationId: string
  ): Promise<ActionResult<{ success: boolean; newVersionNumber: number }>> {
    logger.info("Restoring transcription version", {
      component: "TranscriptionEditService.restoreTranscriptionVersion",
      recordingId,
      versionNumber,
      userId,
    });

    try {
      // Verify recording belongs to organization
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        return err(
          ActionErrors.notFound(
            "Recording",
            "TranscriptionEditService.restoreTranscriptionVersion"
          )
        );
      }

      try {
        assertOrganizationAccess(
          recording.organizationId,
          organizationId,
          "TranscriptionEditService.restoreTranscriptionVersion"
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Recording not found",
            "TranscriptionEditService.restoreTranscriptionVersion"
          )
        );
      }

      // Get the version to restore
      const version =
        await TranscriptionHistoryQueries.selectTranscriptionVersion(
          recordingId,
          versionNumber
        );

      if (!version) {
        logger.warn("Transcription version not found", {
          component: "TranscriptionEditService.restoreTranscriptionVersion",
          recordingId,
          versionNumber,
        });

        return err(
          ActionErrors.notFound(
            "Transcription version",
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
        userId,
        organizationId
      );

      if (result.isErr()) {
        return err(result.error);
      }

      return ok({
        success: result.value.success,
        newVersionNumber: result.value.versionNumber,
      });
    } catch (error) {
      logger.error("Failed to restore transcription version", {
        component: "TranscriptionEditService.restoreTranscriptionVersion",
        error,
        recordingId,
        versionNumber,
      });

      return err(
        ActionErrors.internal(
          "Failed to restore transcription version",
          error as Error,
          "TranscriptionEditService.restoreTranscriptionVersion"
        )
      );
    }
  }
}

