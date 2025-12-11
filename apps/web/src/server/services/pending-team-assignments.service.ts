import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { err, ok } from "neverthrow";
import { PendingTeamAssignmentsQueries } from "../data-access/pending-team-assignments.queries";
import { TeamService } from "./team.service";

/**
 * Service for managing pending team assignments
 * Handles applying team assignments when invitations are accepted
 */
export class PendingTeamAssignmentsService {
  /**
   * Apply pending team assignments for an invitation
   * This should be called when an invitation is accepted
   *
   * @param invitationId - The invitation ID
   * @param userId - The user ID who accepted the invitation
   * @param organizationId - The organization ID
   */
  static async applyPendingAssignments(
    invitationId: string,
    userId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      // Get pending team assignments
      const teamIds =
        await PendingTeamAssignmentsQueries.getPendingAssignmentsByInvitationId(
          invitationId
        );

      if (teamIds.length === 0) {
        return ok(undefined);
      }

      // Assign user to each team
      const results = await Promise.all(
        teamIds.map((teamId) =>
          TeamService.assignUserToTeam(userId, teamId, "member")
        )
      );

      // Check if any assignments failed
      const failures = results.filter((r) => r.isErr());
      if (failures.length > 0) {
        logger.error("Failed to apply some pending team assignments", {
          invitationId,
          userId,
          organizationId,
          failedTeamIds: failures.map((f) => f.error),
        });

        // Still delete pending assignments even if some failed
        // The successful ones are already applied
        await PendingTeamAssignmentsQueries.deletePendingAssignmentsByInvitationId(
          invitationId
        );

        return err(
          ActionErrors.internal(
            `Failed to assign user to ${failures.length} team(s)`,
            undefined,
            "PendingTeamAssignmentsService.applyPendingAssignments"
          )
        );
      }

      // Delete pending assignments after successful application
      await PendingTeamAssignmentsQueries.deletePendingAssignmentsByInvitationId(
        invitationId
      );

      logger.info("Applied pending team assignments", {
        invitationId,
        userId,
        organizationId,
        teamIds,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Error applying pending team assignments", {
        invitationId,
        userId,
        organizationId,
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return err(
        ActionErrors.internal(
          "Failed to apply pending team assignments",
          error as Error,
          "PendingTeamAssignmentsService.applyPendingAssignments"
        )
      );
    }
  }
}

