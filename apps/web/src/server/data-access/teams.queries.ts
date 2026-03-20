import { auth } from "@/lib/auth";
import type { TeamInput, TeamMember } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "../db";
import { teams, teamMembers } from "../db/schema/auth";

// Infer Better Auth types
type BetterAuthTeam = typeof auth.$Infer.Team;

/**
 * Database queries for Team operations
 * Uses Better Auth APIs for CRUD operations
 * Pure data access layer - no business logic
 */
export class TeamQueries {
  /**
   * Create a new team using Better Auth API.
   * The creator is automatically added as the first team member by Better Auth.
   */
  static async insertTeam(
    data: TeamInput,
    requestHeaders?: Headers,
  ): Promise<BetterAuthTeam> {
    const headersList = requestHeaders ?? (await headers());

    const result = await auth.api.createTeam({
      headers: headersList,
      body: {
        name: data.name,
        organizationId: data.organizationId,
      },
    });

    return result satisfies BetterAuthTeam;
  }

  /**
   * Get all teams for an organization using Better Auth API
   */
  static async selectTeamsByOrganization(
    organizationId: string,
    requestHeaders?: Headers,
  ): Promise<BetterAuthTeam[]> {
    const headersList = requestHeaders ?? (await headers());

    const result = await auth.api.listOrganizationTeams({
      headers: headersList,
      query: {
        organizationId,
      },
    });

    return Array.isArray(result) ? result : ([] satisfies BetterAuthTeam[]);
  }

  /**
   * Get team members using Better Auth API.
   * Requires the requesting user to be a member of the team.
   * Falls back to direct DB query if the API call fails (e.g., for non-member admins viewing).
   */
  static async selectTeamMembers(
    teamId: string,
    requestHeaders?: Headers,
  ): Promise<TeamMember[]> {
    try {
      const headersList = requestHeaders ?? (await headers());
      return await auth.api.listTeamMembers({
        headers: headersList,
        query: { teamId },
      });
    } catch {
      // Fallback to direct DB query for org admins who aren't team members
      const rows = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId));

      return rows.map((row) => ({
        id: row.id,
        teamId: row.teamId,
        userId: row.userId,
        createdAt: row.createdAt ?? new Date(),
      }));
    }
  }

  /**
   * Get a team by ID
   */
  static async selectTeamById(
    id: string,
    organizationId: string,
    requestHeaders?: Headers,
  ): Promise<BetterAuthTeam | null> {
    const headersList = requestHeaders ?? (await headers());

    const allTeams = await auth.api.listOrganizationTeams({
      headers: headersList,
      query: { organizationId },
    });

    const team = allTeams.find((t) => t.id === id);

    if (!team) {
      // Fallback to direct DB query
      const [dbTeam] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, id))
        .limit(1);

      if (!dbTeam) return null;

      return {
        id: dbTeam.id,
        name: dbTeam.name,
        organizationId: dbTeam.organizationId,
        createdAt: dbTeam.createdAt,
        updatedAt: dbTeam.updatedAt ?? undefined,
      } satisfies BetterAuthTeam;
    }

    return team;
  }

  /**
   * Update a team using Better Auth API
   */
  static async updateTeam(
    id: string,
    data: Partial<Omit<TeamInput, "id" | "organizationId" | "createdAt">>,
    requestHeaders?: Headers,
  ): Promise<BetterAuthTeam | null> {
    const headersList = requestHeaders ?? (await headers());

    const result = await auth.api.updateTeam({
      headers: headersList,
      body: {
        teamId: id,
        data: { name: data.name },
      },
    });

    return (
      result && "id" in result ? result : null
    ) satisfies BetterAuthTeam | null;
  }

  /**
   * Delete a team using Better Auth API
   */
  static async deleteTeam(
    id: string,
    organizationId?: string,
    requestHeaders?: Headers,
  ): Promise<void> {
    const headersList = requestHeaders ?? (await headers());

    await auth.api.removeTeam({
      headers: headersList,
      body: { teamId: id, organizationId },
    });
  }

  /**
   * Get teams for the current user using Better Auth API
   */
  static async selectUserTeams(
    _userId: string,
    requestHeaders?: Headers,
  ): Promise<BetterAuthTeam[]> {
    const headersList = requestHeaders ?? (await headers());
    return await auth.api.listUserTeams({
      headers: headersList,
    });
  }
}

/**
 * Database queries for User-Team relationship operations
 * Uses Better Auth APIs for CRUD operations, with DB fallback where needed
 */
export class UserTeamQueries {
  /**
   * Get team memberships for a user via direct DB query.
   * Uses DB instead of API because Better Auth's listUserTeams returns Teams, not TeamMembers.
   */
  static async selectTeamMembers(
    userId: string,
    _requestHeaders?: Headers,
  ): Promise<TeamMember[]> {
    const rows = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    return rows.map((row) => ({
      id: row.id,
      teamId: row.teamId,
      userId: row.userId,
      createdAt: row.createdAt ?? new Date(),
    }));
  }

  /**
   * Check if a user is a member of a specific team (direct DB)
   */
  static async selectUserTeam(
    userId: string,
    teamId: string,
    _requestHeaders?: Headers,
  ): Promise<TeamMember | null> {
    const rows = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));

    const member = rows.find((m) => m.userId === userId);
    if (!member) return null;

    return {
      id: member.id,
      teamId: member.teamId,
      userId: member.userId,
      createdAt: member.createdAt ?? new Date(),
    };
  }

  /**
   * Add a user to a team using Better Auth API
   */
  static async insertUserTeam(
    data: {
      userId: string;
      teamId: string;
      role?: "member" | "lead" | "admin";
    },
    requestHeaders?: Headers,
  ): Promise<TeamMember> {
    const headersList = requestHeaders ?? (await headers());

    await auth.api.addTeamMember({
      headers: headersList,
      body: {
        userId: data.userId,
        teamId: data.teamId,
      },
    });

    // Fetch the created team member
    const members = await auth.api.listTeamMembers({
      headers: headersList,
      query: { teamId: data.teamId },
    });

    const member = members.find((m) => m.userId === data.userId);
    if (!member) {
      throw new Error("Failed to create team member");
    }

    return member;
  }

  /**
   * Remove a user from a team using Better Auth API
   */
  static async deleteUserTeam(
    userId: string,
    teamId: string,
    requestHeaders?: Headers,
  ): Promise<void> {
    const headersList = requestHeaders ?? (await headers());

    await auth.api.removeTeamMember({
      headers: headersList,
      body: { userId, teamId },
    });
  }

  /**
   * Delete all team members for a team (direct DB for bulk operation)
   */
  static async deleteAllTeamMembers(
    teamId: string,
    _requestHeaders?: Headers,
  ): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
  }

  /**
   * Update user's role in a team
   * Note: Better Auth doesn't support team member roles natively
   */
  static async updateUserTeamRole(
    userId: string,
    teamId: string,
    _role: "member" | "lead" | "admin",
    requestHeaders?: Headers,
  ): Promise<TeamMember | null> {
    const member = await this.selectUserTeam(userId, teamId, requestHeaders);
    return member;
  }
}
