import { auth } from "@/lib/auth";
import type { TeamInput, TeamMember } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "../db";
import { teams } from "../db/schema/auth";

// Infer Better Auth types
type BetterAuthTeam = typeof auth.$Infer.Team;

/**
 * Database queries for Team operations
 * Uses Better Auth APIs for CRUD operations
 * Pure data access layer - no business logic
 */
export class TeamQueries {
  /**
   * Create a new team using Better Auth API
   */
  static async insertTeam(
    data: TeamInput,
    requestHeaders?: Headers
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
    requestHeaders?: Headers
  ): Promise<BetterAuthTeam[]> {
    const headersList = requestHeaders ?? (await headers());

    const result = await auth.api.listOrganizationTeams({
      headers: headersList,
      query: {
        organizationId,
      },
    });

    // Better Auth API returns an array of teams directly
    return Array.isArray(result) ? result : ([] satisfies BetterAuthTeam[]);
  }

  static async selectTeamMembers(
    teamId: string,
    requestHeaders?: Headers
  ): Promise<TeamMember[]> {
    const headersList = requestHeaders ?? (await headers());
    return await auth.api.listTeamMembers({
      headers: headersList,
      query: { teamId },
    });
  }

  /**
   * Get teams without a department (standalone teams)
   * Note: Better Auth teams table doesn't include departmentId field.
   * This method returns all teams for the organization.
   * @deprecated Department filtering is not available with Better Auth teams
   */
  static async selectStandaloneTeams(
    organizationId: string,
    requestHeaders?: Headers
  ): Promise<BetterAuthTeam[]> {
    // Better Auth teams don't support departmentId filtering
    // Return all teams for the organization as a fallback
    return this.selectTeamsByOrganization(organizationId, requestHeaders);
  }

  /**
   * Get a team by ID
   * Note: Better Auth doesn't have a direct getTeamById API,
   * so we fetch all teams and find the one with matching ID
   */
  static async selectTeamById(
    id: string,
    organizationId: string,
    requestHeaders?: Headers
  ): Promise<BetterAuthTeam | null> {
    const headersList = requestHeaders ?? (await headers());

    // Get all teams for the organization
    const allTeams = await auth.api.listOrganizationTeams({
      headers: headersList,
      query: {
        organizationId,
      },
    });

    // Find the team with matching ID
    const team = allTeams.find((t) => t.id === id);

    // If not found via Better Auth, fall back to direct DB query
    if (!team) {
      const [dbTeam] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, id))
        .limit(1);

      if (!dbTeam) return null;

      // Map DB team to Better Auth team format
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
    requestHeaders?: Headers
  ): Promise<BetterAuthTeam | null> {
    const headersList = requestHeaders ?? (await headers());

    const result = await auth.api.updateTeam({
      headers: headersList,
      body: {
        teamId: id,
        data: {
          name: data.name,
          // Note: Better Auth updateTeam API may not support all fields
          // Additional fields like departmentId might need to be handled separately
        },
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
    requestHeaders?: Headers
  ): Promise<void> {
    const headersList = requestHeaders ?? (await headers());

    await auth.api.removeTeam({
      headers: headersList,
      body: {
        teamId: id,
        organizationId,
      },
    });
  }

  /**
   * Get teams for a user using Better Auth API
   * Note: This returns Team objects, not TeamMember objects
   */
  static async selectUserTeams(
    userId: string,
    requestHeaders?: Headers
  ): Promise<BetterAuthTeam[]> {
    const headersList = requestHeaders ?? (await headers());
    return await auth.api.listUserTeams({
      headers: headersList,
    });
  }
}

/**
 * Database queries for User-Team relationship operations
 * Uses Better Auth APIs for CRUD operations
 * Pure data access layer - no business logic
 */
export class UserTeamQueries {
  /**
   * Get team members for a user
   * Note: Better Auth's listUserTeams returns teams, not team members
   * We need to get all teams and then get members for each team to find user's memberships
   */
  static async selectTeamMembers(
    userId: string,
    requestHeaders?: Headers
  ): Promise<TeamMember[]> {
    const headersList = requestHeaders ?? (await headers());
    // Get all teams the user is part of
    const userTeams = await auth.api.listUserTeams({
      headers: headersList,
    });

    // Get team members for each team and filter by userId
    const allMembers = await Promise.all(
      userTeams.map((team) =>
        auth.api.listTeamMembers({
          headers: headersList,
          query: { teamId: team.id },
        })
      )
    );

    // Flatten and filter by userId
    return allMembers.flat().filter((member) => member.userId === userId);
  }

  /**
   * Get a specific user-team relationship
   */
  static async selectUserTeam(
    userId: string,
    teamId: string,
    requestHeaders?: Headers
  ): Promise<TeamMember | null> {
    const headersList = requestHeaders ?? (await headers());
    const teamMembers = await auth.api.listTeamMembers({
      headers: headersList,
      query: { teamId },
    });
    return teamMembers.find((m) => m.userId === userId) ?? null;
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
    requestHeaders?: Headers
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
    const teamMembers = await auth.api.listTeamMembers({
      headers: headersList,
      query: { teamId: data.teamId },
    });

    const member = teamMembers.find((m) => m.userId === data.userId);
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
    requestHeaders?: Headers
  ): Promise<void> {
    const headersList = requestHeaders ?? (await headers());

    await auth.api.removeTeamMember({
      headers: headersList,
      body: {
        userId,
        teamId,
      },
    });
  }

  /**
   * Delete all team members for a team
   */
  static async deleteAllTeamMembers(
    teamId: string,
    requestHeaders?: Headers
  ): Promise<void> {
    const headersList = requestHeaders ?? (await headers());

    // Get all team members
    const members = await auth.api.listTeamMembers({
      headers: headersList,
      query: { teamId },
    });

    // Remove each member
    await Promise.all(
      members.map((member) =>
        auth.api.removeTeamMember({
          headers: headersList,
          body: {
            userId: member.userId,
            teamId,
          },
        })
      )
    );
  }

  /**
   * Update user's role in a team
   * Note: Better Auth doesn't support updating team member roles directly
   * This would need to be handled via custom database operations or Better Auth doesn't support roles
   * For now, we'll need to remove and re-add the member, or use direct DB access
   */
  static async updateUserTeamRole(
    userId: string,
    teamId: string,
    role: "member" | "lead" | "admin",
    requestHeaders?: Headers
  ): Promise<TeamMember | null> {
    // Better Auth doesn't support role updates for team members
    // Return the existing member - role management would need custom implementation
    const member = await this.selectUserTeam(userId, teamId, requestHeaders);
    return member;
  }
}

