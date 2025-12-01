import type { Team, TeamInput, TeamMember } from "better-auth/plugins";
import { err, ok } from "neverthrow";
import { getAuthSession } from "../../lib/auth/auth-helpers";
import { CacheInvalidation } from "../../lib/cache-utils";
import { logger } from "../../lib/logger";
import { assertOrganizationAccess } from "../../lib/rbac/organization-isolation";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import { TeamQueries, UserTeamQueries } from "../data-access/teams.queries";
import type {
  CreateTeamDto,
  TeamDto,
  TeamMemberWithUserDto,
  UpdateTeamDto,
  UserTeamRoleDto,
} from "../dto/team.dto";
import { UserQueries } from "../data-access/user.queries";
type UserTeamRole = "member" | "lead" | "admin";

/**
 * Business logic layer for Team operations
 * Orchestrates data access and handles business rules
 */
export class TeamService {
  /**
   * Get all teams for an organization
   */
  static async getTeamsByOrganization(
    organizationId: string
  ): Promise<ActionResult<Team[]>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TeamService.getTeamsByOrganization"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TeamService.getTeamsByOrganization"
          )
        );
      }

      // Verify organization access
      assertOrganizationAccess(
        organizationId,
        organization.id,
        "TeamService.getTeamsByOrganization"
      );

      const teams = await TeamQueries.selectTeamsByOrganization(organizationId);

      return ok(teams);
    } catch (error) {
      logger.error("Failed to get teams", { organizationId }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get teams",
          error as Error,
          "TeamService.getTeamsByOrganization"
        )
      );
    }
  }

  /**
   * Get a team by ID
   */
  static async getTeamById(id: string): Promise<ActionResult<Team | null>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TeamService.getTeamById"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TeamService.getTeamById"
          )
        );
      }

      const team = await TeamQueries.selectTeamById(id, organization.id);

      if (!team) {
        return ok(null);
      }

      // Verify organization access
      assertOrganizationAccess(
        team.organizationId,
        organization.id,
        "TeamService.getTeamById"
      );

      return ok(team);
    } catch (error) {
      logger.error("Failed to get team", { id }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get team",
          error as Error,
          "TeamService.getTeamById"
        )
      );
    }
  }

  /**
   * Get teams for a user
   */
  static async getUserTeams(
    userId: string
  ): Promise<ActionResult<TeamMember[]>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TeamService.getUserTeams"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TeamService.getUserTeams"
          )
        );
      }

      const userTeams = await TeamQueries.selectTeamMembers(userId);

      // Filter to only teams in the user's organization
      const teamIds = userTeams.map((ut) => ut.teamId);
      const teams =
        teamIds.length > 0
          ? await TeamQueries.selectTeamsByOrganization(organization.id)
          : [];

      const validTeamIds = new Set(teams.map((t) => t.id));
      const filteredUserTeams = userTeams.filter((ut) =>
        validTeamIds.has(ut.teamId)
      );

      return ok(filteredUserTeams);
    } catch (error) {
      logger.error("Failed to get user teams", { userId }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get user teams",
          error as Error,
          "TeamService.getUserTeams"
        )
      );
    }
  }

  /**
   * Get team members
   * Returns all members of a specific team
   */
  static async getTeamMembers(
    teamId: string
  ): Promise<ActionResult<TeamMember[]>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TeamService.getTeamMembers"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TeamService.getTeamMembers"
          )
        );
      }

      // Verify team exists and belongs to organization
      const team = await TeamQueries.selectTeamById(teamId, organization.id);
      if (!team) {
        return err(ActionErrors.notFound("Team", "TeamService.getTeamMembers"));
      }

      // Verify organization access
      assertOrganizationAccess(
        team.organizationId,
        organization.id,
        "TeamService.getTeamMembers"
      );

      const members = await TeamQueries.selectTeamMembers(teamId);

      return ok(members ?? []);
    } catch (error) {
      logger.error("Failed to get team members", { teamId }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get team members",
          error as Error,
          "TeamService.getTeamMembers"
        )
      );
    }
  }

  /**
   * Get team members with user details
   * Returns team members enriched with user information (name, email, image)
   */
  static async getTeamMembersWithUserDetails(
    teamId: string
  ): Promise<ActionResult<TeamMemberWithUserDto[]>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TeamService.getTeamMembersWithUserDetails"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TeamService.getTeamMembersWithUserDetails"
          )
        );
      }

      // Verify team exists and belongs to organization
      const team = await TeamQueries.selectTeamById(teamId, organization.id);
      if (!team) {
        return err(
          ActionErrors.notFound("Team", "TeamService.getTeamMembersWithUserDetails")
        );
      }

      // Verify organization access
      assertOrganizationAccess(
        team.organizationId,
        organization.id,
        "TeamService.getTeamMembersWithUserDetails"
      );

      // Get team members
      const members = await TeamQueries.selectTeamMembers(teamId);

      if (!members || members.length === 0) {
        return ok([]);
      }

      // Get unique user IDs
      const userIds = Array.from(new Set(members.map((m) => m.userId)));

      // Fetch user details
      const usersData = await UserQueries.findByIds(userIds);

      // Create a map for quick lookup
      const usersMap = new Map(
        usersData.map((user) => [
          user.id,
          {
            name: user.name,
            email: user.email,
            image: user.image,
          },
        ])
      );

      // Combine member data with user details
      const membersWithUserDetails: TeamMemberWithUserDto[] = members.map(
        (member) => {
          const userDetails = usersMap.get(member.userId);
          return {
            id: member.id,
            userId: member.userId,
            teamId: member.teamId,
            userName: userDetails?.name ?? null,
            userEmail: userDetails?.email ?? null,
            userImage: userDetails?.image ?? null,
            createdAt: member.createdAt ?? null,
          };
        }
      );

      return ok(membersWithUserDetails);
    } catch (error) {
      logger.error(
        "Failed to get team members with user details",
        { teamId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get team members with user details",
          error as Error,
          "TeamService.getTeamMembersWithUserDetails"
        )
      );
    }
  }

  /**
   * Get user teams for multiple users (batch query)
   * Returns a map of userId -> UserTeamRoleDto[]
   */
  static async getUserTeamsByUserIds(
    userIds: string[],
    organizationId: string
  ): Promise<ActionResult<Map<string, UserTeamRoleDto[]>>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TeamService.getUserTeamsByUserIds"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TeamService.getUserTeamsByUserIds"
          )
        );
      }

      // Verify organization access
      assertOrganizationAccess(
        organizationId,
        organization.id,
        "TeamService.getUserTeamsByUserIds"
      );

      if (userIds.length === 0) {
        return ok(new Map());
      }

      // Fetch all user teams in one query
      const allUserTeamsArrays = await Promise.all(
        userIds.map((userId) => UserTeamQueries.selectTeamMembers(userId))
      );

      // Flatten the array of arrays
      const allUserTeams = allUserTeamsArrays.flat();

      // Get all team IDs and fetch teams to filter by organization
      const teamIds = Array.from(
        new Set(allUserTeams.map((ut: TeamMember) => ut.teamId))
      );
      const teams =
        teamIds.length > 0
          ? await TeamQueries.selectTeamsByOrganization(organizationId)
          : [];

      const validTeamIds = new Set(teams.map((t) => t.id));

      // Build the map grouped by userId
      const userTeamsMap = new Map<string, UserTeamRoleDto[]>();
      for (const ut of allUserTeams) {
        // Only include teams in the user's organization
        if (validTeamIds.has(ut.teamId)) {
          if (!userTeamsMap.has(ut.userId)) {
            userTeamsMap.set(ut.userId, []);
          }
          userTeamsMap.get(ut.userId)!.push({
            userId: ut.userId,
            teamId: ut.teamId,
            role: "member", // Better Auth doesn't support roles for team members
            joinedAt: ut.createdAt ?? new Date(),
          });
        }
      }

      return ok(userTeamsMap);
    } catch (error) {
      logger.error(
        "Failed to get user teams by user IDs",
        { userIds, organizationId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get user teams by user IDs",
          error as Error,
          "TeamService.getUserTeamsByUserIds"
        )
      );
    }
  }

  /**
   * Create a new team
   */
  static async createTeam(data: CreateTeamDto): Promise<ActionResult<TeamDto>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TeamService.createTeam"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TeamService.createTeam"
          )
        );
      }

      // Verify organization access
      assertOrganizationAccess(
        data.organizationId,
        organization.id,
        "TeamService.createTeam"
      );

      // Convert CreateTeamDto to TeamInput for Better Auth
      const teamInput = {
        name: data.name,
        organizationId: data.organizationId,
      };

      const team = await TeamQueries.insertTeam(teamInput as TeamInput);

      // Invalidate cache
      CacheInvalidation.invalidateTeamCache(data.organizationId);

      const teamDto: TeamDto = {
        id: team.id,
        departmentId: data.departmentId ?? null,
        organizationId: team.organizationId,
        name: team.name,
        description: data.description ?? null,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt ?? team.createdAt,
      };

      return ok(teamDto);
    } catch (error) {
      logger.error("Failed to create team", { data }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to create team",
          error as Error,
          "TeamService.createTeam"
        )
      );
    }
  }

  /**
   * Update a team
   */
  static async updateTeam(
    id: string,
    data: UpdateTeamDto
  ): Promise<ActionResult<TeamDto>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TeamService.updateTeam"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TeamService.updateTeam"
          )
        );
      }

      const existing = await TeamQueries.selectTeamById(id, organization.id);
      if (!existing) {
        return err(ActionErrors.notFound("Team", "TeamService.updateTeam"));
      }

      // Verify organization access
      assertOrganizationAccess(
        existing.organizationId,
        organization.id,
        "TeamService.updateTeam"
      );

      // Convert UpdateTeamDto to Better Auth format (only name is supported)
      const updateData: Partial<
        Omit<TeamInput, "id" | "organizationId" | "createdAt">
      > = {};
      if (data.name !== undefined) {
        updateData.name = data.name;
      }

      const team = await TeamQueries.updateTeam(id, updateData);

      if (!team) {
        return err(ActionErrors.notFound("Team", "TeamService.updateTeam"));
      }

      // Note: Better Auth doesn't support departmentId or description in teams
      // These would need to be stored separately if required
      const finalDepartmentId =
        data.departmentId !== undefined ? data.departmentId : null;
      const finalDescription =
        data.description !== undefined ? data.description : null;

      CacheInvalidation.invalidateTeamCache(existing.organizationId, id);

      const teamDto: TeamDto = {
        id: team.id,
        departmentId: finalDepartmentId,
        organizationId: team.organizationId,
        name: team.name,
        description: finalDescription,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt ?? team.createdAt,
      };

      return ok(teamDto);
    } catch (error) {
      logger.error("Failed to update team", { id, data }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to update team",
          error as Error,
          "TeamService.updateTeam"
        )
      );
    }
  }

  /**
   * Delete a team
   */
  static async deleteTeam(id: string): Promise<ActionResult<void>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TeamService.deleteTeam"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TeamService.deleteTeam"
          )
        );
      }

      const existing = await TeamQueries.selectTeamById(id, organization.id);
      if (!existing) {
        return err(ActionErrors.notFound("Team", "TeamService.deleteTeam"));
      }

      // Verify organization access
      assertOrganizationAccess(
        existing.organizationId,
        organization.id,
        "TeamService.deleteTeam"
      );

      // Delete all user-team relationships first
      await UserTeamQueries.deleteAllTeamMembers(id);

      await TeamQueries.deleteTeam(id, existing.organizationId);

      // Invalidate cache
      CacheInvalidation.invalidateTeamCache(existing.organizationId, id);

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to delete team", { id }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to delete team",
          error as Error,
          "TeamService.deleteTeam"
        )
      );
    }
  }

  /**
   * Assign a user to a team
   */
  static async assignUserToTeam(
    userId: string,
    teamId: string,
    role: UserTeamRole = "member"
  ): Promise<ActionResult<UserTeamRoleDto>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TeamService.assignUserToTeam"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TeamService.assignUserToTeam"
          )
        );
      }

      const team = await TeamQueries.selectTeamById(teamId, organization.id);
      if (!team) {
        return err(
          ActionErrors.notFound("Team", "TeamService.assignUserToTeam")
        );
      }

      // Verify organization access
      assertOrganizationAccess(
        team.organizationId,
        organization.id,
        "TeamService.assignUserToTeam"
      );

      // Check if user is already in team
      const existing = await UserTeamQueries.selectUserTeam(userId, teamId);
      if (existing) {
        return err(
          ActionErrors.badRequest(
            "User is already a member of this team",
            "TeamService.assignUserToTeam"
          )
        );
      }

      const userTeam = await UserTeamQueries.insertUserTeam({
        userId,
        teamId,
        role,
      });

      // Invalidate cache
      CacheInvalidation.invalidateTeamCache(team.organizationId);

      const userTeamDto: UserTeamRoleDto = {
        userId: userTeam.userId,
        teamId: userTeam.teamId,
        role: "member", // Better Auth doesn't support roles for team members
        joinedAt: userTeam.createdAt ?? new Date(),
      };

      return ok(userTeamDto);
    } catch (error) {
      logger.error(
        "Failed to assign user to team",
        { userId, teamId, role },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to assign user to team",
          error as Error,
          "TeamService.assignUserToTeam"
        )
      );
    }
  }

  /**
   * Remove a user from a team
   */
  static async removeUserFromTeam(
    userId: string,
    teamId: string
  ): Promise<ActionResult<void>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TeamService.removeUserFromTeam"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TeamService.removeUserFromTeam"
          )
        );
      }

      const team = await TeamQueries.selectTeamById(teamId, organization.id);
      if (!team) {
        return err(
          ActionErrors.notFound("Team", "TeamService.removeUserFromTeam")
        );
      }

      // Verify organization access
      assertOrganizationAccess(
        team.organizationId,
        organization.id,
        "TeamService.removeUserFromTeam"
      );

      await UserTeamQueries.deleteUserTeam(userId, teamId);

      // Invalidate cache
      CacheInvalidation.invalidateTeamCache(team.organizationId);

      return ok(undefined);
    } catch (error) {
      logger.error(
        "Failed to remove user from team",
        { userId, teamId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to remove user from team",
          error as Error,
          "TeamService.removeUserFromTeam"
        )
      );
    }
  }

  /**
   * Update user's role in a team
   */
  static async updateUserTeamRole(
    userId: string,
    teamId: string,
    role: UserTeamRole
  ): Promise<ActionResult<UserTeamRoleDto>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TeamService.updateUserTeamRole"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TeamService.updateUserTeamRole"
          )
        );
      }

      const team = await TeamQueries.selectTeamById(teamId, organization.id);
      if (!team) {
        return err(
          ActionErrors.notFound("Team", "TeamService.updateUserTeamRole")
        );
      }

      // Verify organization access
      assertOrganizationAccess(
        team.organizationId,
        organization.id,
        "TeamService.updateUserTeamRole"
      );

      const userTeam = await UserTeamQueries.updateUserTeamRole(
        userId,
        teamId,
        role
      );

      if (!userTeam) {
        return err(
          ActionErrors.notFound("UserTeam", "TeamService.updateUserTeamRole")
        );
      }

      // Invalidate cache
      CacheInvalidation.invalidateTeamCache(team.organizationId);

      const userTeamDto: UserTeamRoleDto = {
        userId: userTeam.userId,
        teamId: userTeam.teamId,
        role: "member", // Better Auth doesn't support roles for team members
        joinedAt: userTeam.createdAt ?? new Date(),
      };

      return ok(userTeamDto);
    } catch (error) {
      logger.error(
        "Failed to update user team role",
        { userId, teamId, role },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to update user team role",
          error as Error,
          "TeamService.updateUserTeamRole"
        )
      );
    }
  }
}

