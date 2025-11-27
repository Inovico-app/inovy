import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  userTeams,
  type NewUserTeam,
  type UserTeam,
  type UserTeamRole,
} from "../db/schema/user-teams";

export type { UserTeamRole };

/**
 * Database queries for User-Team relationship operations
 * Pure data access layer - no business logic
 */
export class UserTeamQueries {
  /**
   * Assign a user to a team
   */
  static async insertUserTeam(data: NewUserTeam): Promise<UserTeam> {
    const [userTeam] = await db.insert(userTeams).values(data).returning();

    return userTeam;
  }

  /**
   * Get all teams for a user
   */
  static async selectUserTeams(userId: string): Promise<UserTeam[]> {
    return await db
      .select()
      .from(userTeams)
      .where(eq(userTeams.userId, userId));
  }

  /**
   * Get all members of a team
   */
  static async selectTeamMembers(teamId: string): Promise<UserTeam[]> {
    return await db
      .select()
      .from(userTeams)
      .where(eq(userTeams.teamId, teamId));
  }

  /**
   * Get user-team relationship by user and team IDs
   */
  static async selectUserTeam(
    userId: string,
    teamId: string
  ): Promise<UserTeam | null> {
    const [userTeam] = await db
      .select()
      .from(userTeams)
      .where(and(eq(userTeams.userId, userId), eq(userTeams.teamId, teamId)))
      .limit(1);

    return userTeam ?? null;
  }

  /**
   * Get users by team IDs (for filtering)
   */
  static async selectUsersByTeamIds(
    teamIds: string[]
  ): Promise<Array<{ userId: string; teamId: string }>> {
    if (teamIds.length === 0) {
      return [];
    }

    const results = await db
      .select({
        userId: userTeams.userId,
        teamId: userTeams.teamId,
      })
      .from(userTeams)
      .where(inArray(userTeams.teamId, teamIds));

    return results;
  }

  /**
   * Get user teams for multiple users (batch query)
   */
  static async selectUserTeamsByUserIds(
    userIds: string[]
  ): Promise<UserTeam[]> {
    if (userIds.length === 0) {
      return [];
    }

    return await db
      .select()
      .from(userTeams)
      .where(inArray(userTeams.userId, userIds));
  }

  /**
   * Update user's role in a team
   */
  static async updateUserTeamRole(
    userId: string,
    teamId: string,
    role: UserTeamRole
  ): Promise<UserTeam | null> {
    const [userTeam] = await db
      .update(userTeams)
      .set({ role })
      .where(and(eq(userTeams.userId, userId), eq(userTeams.teamId, teamId)))
      .returning();

    return userTeam ?? null;
  }

  /**
   * Remove a user from a team
   */
  static async deleteUserTeam(userId: string, teamId: string): Promise<void> {
    await db
      .delete(userTeams)
      .where(and(eq(userTeams.userId, userId), eq(userTeams.teamId, teamId)));
  }

  /**
   * Remove all users from a team (when team is deleted)
   */
  static async deleteAllTeamMembers(teamId: string): Promise<void> {
    await db.delete(userTeams).where(eq(userTeams.teamId, teamId));
  }
}

