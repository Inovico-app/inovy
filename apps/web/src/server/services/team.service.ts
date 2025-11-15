import { err, ok } from "neverthrow";
import { ActionErrors, type ActionResult } from "../../lib/action-errors";
import { getAuthSession } from "../../lib/auth";
import { CacheInvalidation } from "../../lib/cache-utils";
import { assertOrganizationAccess } from "../../lib/organization-isolation";
import { logger } from "../../lib/logger";
import { DepartmentQueries } from "../data-access/departments.queries";
import { TeamQueries } from "../data-access/teams.queries";
import {
  UserTeamQueries,
  type UserTeamRole,
} from "../data-access/user-teams.queries";
import type { Team } from "../db/schema";
import type {
  CreateTeamDto,
  TeamDto,
  UpdateTeamDto,
  UserTeamRoleDto,
} from "../dto/team.dto";

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
  ): Promise<ActionResult<TeamDto[]>> {
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
        organization.orgCode,
        "TeamService.getTeamsByOrganization"
      );

      const teams = await TeamQueries.selectTeamsByOrganization(organizationId);

      const teamDtos: TeamDto[] = teams.map((team) => ({
        id: team.id,
        departmentId: team.departmentId,
        organizationId: team.organizationId,
        name: team.name,
        description: team.description,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      }));

      return ok(teamDtos);
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
   * Get teams by department
   */
  static async getTeamsByDepartment(
    departmentId: string
  ): Promise<ActionResult<TeamDto[]>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "TeamService.getTeamsByDepartment"
          )
        );
      }

      const { organization } = authResult.value;
      if (!organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "TeamService.getTeamsByDepartment"
          )
        );
      }

      // Validate department exists and user has access
      const department = await DepartmentQueries.selectDepartmentById(
        departmentId
      );
      if (!department) {
        return err(
          ActionErrors.notFound("Department", "TeamService.getTeamsByDepartment")
        );
      }

      // Verify organization access
      assertOrganizationAccess(
        department.organizationId,
        organization.orgCode,
        "TeamService.getTeamsByDepartment"
      );

      const teams = await TeamQueries.selectTeamsByDepartment(departmentId);

      const teamDtos: TeamDto[] = teams.map((team) => ({
        id: team.id,
        departmentId: team.departmentId,
        organizationId: team.organizationId,
        name: team.name,
        description: team.description,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      }));

      return ok(teamDtos);
    } catch (error) {
      logger.error(
        "Failed to get teams by department",
        { departmentId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get teams by department",
          error as Error,
          "TeamService.getTeamsByDepartment"
        )
      );
    }
  }

  /**
   * Get a team by ID
   */
  static async getTeamById(
    id: string
  ): Promise<ActionResult<TeamDto | null>> {
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

      const team = await TeamQueries.selectTeamById(id);

      if (!team) {
        return ok(null);
      }

      // Verify organization access
      assertOrganizationAccess(
        team.organizationId,
        organization.orgCode,
        "TeamService.getTeamById"
      );

      const teamDto: TeamDto = {
        id: team.id,
        departmentId: team.departmentId,
        organizationId: team.organizationId,
        name: team.name,
        description: team.description,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      };

      return ok(teamDto);
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
  ): Promise<ActionResult<UserTeamRoleDto[]>> {
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

      const userTeams = await UserTeamQueries.selectUserTeams(userId);

      // Filter to only teams in the user's organization
      const teamIds = userTeams.map((ut) => ut.teamId);
      const teams =
        teamIds.length > 0
          ? await TeamQueries.selectTeamsByOrganization(organization.orgCode)
          : [];

      const validTeamIds = new Set(teams.map((t) => t.id));
      const filteredUserTeams = userTeams.filter((ut) =>
        validTeamIds.has(ut.teamId)
      );

      const userTeamDtos: UserTeamRoleDto[] = filteredUserTeams.map((ut) => ({
        userId: ut.userId,
        teamId: ut.teamId,
        role: ut.role,
        joinedAt: ut.joinedAt,
      }));

      return ok(userTeamDtos);
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
        organization.orgCode,
        "TeamService.getUserTeamsByUserIds"
      );

      if (userIds.length === 0) {
        return ok(new Map());
      }

      // Fetch all user teams in one query
      const allUserTeams = await UserTeamQueries.selectUserTeamsByUserIds(
        userIds
      );

      // Get all team IDs and fetch teams to filter by organization
      const teamIds = Array.from(new Set(allUserTeams.map((ut) => ut.teamId)));
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
            role: ut.role,
            joinedAt: ut.joinedAt,
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
  static async createTeam(
    data: CreateTeamDto
  ): Promise<ActionResult<TeamDto>> {
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
        organization.orgCode,
        "TeamService.createTeam"
      );

      // Validate department if provided
      if (data.departmentId) {
        const department = await DepartmentQueries.selectDepartmentById(
          data.departmentId
        );
        if (!department) {
          return err(
            ActionErrors.badRequest(
              "Department not found",
              "TeamService.createTeam"
            )
          );
        }
        if (department.organizationId !== data.organizationId) {
          return err(
            ActionErrors.badRequest(
              "Department must be in the same organization",
              "TeamService.createTeam"
            )
          );
        }
      }

      const team = await TeamQueries.insertTeam(data);

      // Invalidate cache
      CacheInvalidation.invalidateTeamCache(data.organizationId);

      const teamDto: TeamDto = {
        id: team.id,
        departmentId: team.departmentId,
        organizationId: team.organizationId,
        name: team.name,
        description: team.description,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
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

      const existing = await TeamQueries.selectTeamById(id);
      if (!existing) {
        return err(
          ActionErrors.notFound("Team", "TeamService.updateTeam")
        );
      }

      // Verify organization access
      assertOrganizationAccess(
        existing.organizationId,
        organization.orgCode,
        "TeamService.updateTeam"
      );

      // Validate department if provided
      if (data.departmentId !== undefined && data.departmentId !== null) {
        const department = await DepartmentQueries.selectDepartmentById(
          data.departmentId
        );
        if (!department) {
          return err(
            ActionErrors.badRequest(
              "Department not found",
              "TeamService.updateTeam"
            )
          );
        }
        if (department.organizationId !== existing.organizationId) {
          return err(
            ActionErrors.badRequest(
              "Department must be in the same organization",
              "TeamService.updateTeam"
            )
          );
        }
      }

      const team = await TeamQueries.updateTeam(id, data);

      // Invalidate cache
      CacheInvalidation.invalidateTeamCache(existing.organizationId);

      const teamDto: TeamDto = {
        id: team.id,
        departmentId: team.departmentId,
        organizationId: team.organizationId,
        name: team.name,
        description: team.description,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
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

      const existing = await TeamQueries.selectTeamById(id);
      if (!existing) {
        return err(
          ActionErrors.notFound("Team", "TeamService.deleteTeam")
        );
      }

      // Verify organization access
      assertOrganizationAccess(
        existing.organizationId,
        organization.orgCode,
        "TeamService.deleteTeam"
      );

      // Delete all user-team relationships first
      await UserTeamQueries.deleteAllTeamMembers(id);

      await TeamQueries.deleteTeam(id);

      // Invalidate cache
      CacheInvalidation.invalidateTeamCache(existing.organizationId);

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

      const team = await TeamQueries.selectTeamById(teamId);
      if (!team) {
        return err(
          ActionErrors.notFound("Team", "TeamService.assignUserToTeam")
        );
      }

      // Verify organization access
      assertOrganizationAccess(
        team.organizationId,
        organization.orgCode,
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
        role: userTeam.role,
        joinedAt: userTeam.joinedAt,
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

      const team = await TeamQueries.selectTeamById(teamId);
      if (!team) {
        return err(
          ActionErrors.notFound("Team", "TeamService.removeUserFromTeam")
        );
      }

      // Verify organization access
      assertOrganizationAccess(
        team.organizationId,
        organization.orgCode,
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

      const team = await TeamQueries.selectTeamById(teamId);
      if (!team) {
        return err(
          ActionErrors.notFound("Team", "TeamService.updateUserTeamRole")
        );
      }

      // Verify organization access
      assertOrganizationAccess(
        team.organizationId,
        organization.orgCode,
        "TeamService.updateUserTeamRole"
      );

      const userTeam = await UserTeamQueries.updateUserTeamRole(
        userId,
        teamId,
        role
      );

      if (!userTeam) {
        return err(
          ActionErrors.notFound(
            "UserTeam",
            "TeamService.updateUserTeamRole"
          )
        );
      }

      // Invalidate cache
      CacheInvalidation.invalidateTeamCache(team.organizationId);

      const userTeamDto: UserTeamRoleDto = {
        userId: userTeam.userId,
        teamId: userTeam.teamId,
        role: userTeam.role,
        joinedAt: userTeam.joinedAt,
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

