import { logger } from "@/lib/logger";
import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { err, ok } from "neverthrow";

export class UserNotesService {
  /**
   * Update user notes for a recording's summary
   */
  static async updateUserNotes(
    recordingId: string,
    userNotes: string,
    userId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      logger.info("Updating user notes", {
        component: "UserNotesService.updateUserNotes",
        recordingId,
        userId,
        notesLength: userNotes.length,
      });

      // Verify recording belongs to organization
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        return err(
          ActionErrors.notFound("Recording", "UserNotesService.updateUserNotes")
        );
      }

      try {
        assertOrganizationAccess(
          recording.organizationId,
          organizationId,
          "UserNotesService.updateUserNotes"
        );
      } catch (error) {
        return err(
          ActionErrors.notFound(
            "Recording not found",
            "UserNotesService.updateUserNotes"
          )
        );
      }

      // Get the summary insight for this recording
      const insights =
        await AIInsightsQueries.getInsightsByRecordingId(recordingId);
      const summaryInsight = insights.find((i) => i.insightType === "summary");

      if (!summaryInsight) {
        logger.error("Summary not found for recording", {
          component: "UserNotesService.updateUserNotes",
          recordingId,
        });
        return err(
          ActionErrors.notFound("Summary", "UserNotesService.updateUserNotes")
        );
      }

      // Update the user notes field
      await AIInsightsQueries.updateUserNotes(
        summaryInsight.id,
        userNotes,
        userId
      );

      logger.info("User notes updated successfully", {
        component: "UserNotesService.updateUserNotes",
        recordingId,
        insightId: summaryInsight.id,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Error updating user notes", {
        component: "UserNotesService.updateUserNotes",
        error,
        recordingId,
      });
      return err(
        ActionErrors.internal(
          "Failed to update user notes",
          error,
          "UserNotesService.updateUserNotes"
        )
      );
    }
  }
}

