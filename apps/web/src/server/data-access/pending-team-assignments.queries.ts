import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../db";
import { teams } from "../db/schema/auth";
import { pendingTeamAssignments } from "../db/schema/pending-team-assignments";

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

  /**
   * Get team names for pending team assignments by invitation ID
   * Returns an array of team names that will be assigned when the invitation is accepted
   */
  static async getTeamNamesByInvitationId(
    invitationId: string
  ): Promise<string[]> {
    const teamNames = await db
      .select({ name: teams.name })
      .from(pendingTeamAssignments)
      .innerJoin(teams, eq(pendingTeamAssignments.teamId, teams.id))
      .where(eq(pendingTeamAssignments.invitationId, invitationId));

    return teamNames.map((t) => t.name);
  }
}

