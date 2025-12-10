import { nanoid } from "nanoid";
import { db } from "../db";
import { pendingTeamAssignments } from "../db/schema/pending-team-assignments";
import { eq } from "drizzle-orm";

/**
 * Database queries for pending team assignments
 * Stores team assignments that should be applied when an invitation is accepted
 */
export class PendingTeamAssignmentsQueries {
  /**
   * Create pending team assignments for an invitation
   */
  static async createPendingAssignments(
    invitationId: string,
    teamIds: string[]
  ): Promise<void> {
    if (teamIds.length === 0) {
      return;
    }

    await db.insert(pendingTeamAssignments).values(
      teamIds.map((teamId) => ({
        id: nanoid(),
        invitationId,
        teamId,
      }))
    );
  }

  /**
   * Get all pending team assignments for an invitation
   */
  static async getPendingAssignmentsByInvitationId(
    invitationId: string
  ): Promise<string[]> {
    const assignments = await db
      .select({ teamId: pendingTeamAssignments.teamId })
      .from(pendingTeamAssignments)
      .where(eq(pendingTeamAssignments.invitationId, invitationId));

    return assignments.map((a) => a.teamId);
  }

  /**
   * Delete pending team assignments for an invitation
   * Called after assignments are applied or invitation is cancelled
   */
  static async deletePendingAssignmentsByInvitationId(
    invitationId: string
  ): Promise<void> {
    await db
      .delete(pendingTeamAssignments)
      .where(eq(pendingTeamAssignments.invitationId, invitationId));
  }
}

