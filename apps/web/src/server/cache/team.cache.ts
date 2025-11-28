import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import type { TeamDto, UserTeamRoleDto } from "../dto/team.dto";
import { TeamService } from "../services/team.service";

/**
 * Cached team queries
 * Uses Next.js 16 cache with tags for invalidation
 * Uses "use cache: private" to include request-time auth context in cache key
 */

/**
 * Get teams by organization (cached)
 * Calls TeamService which includes business logic and auth checks
 */
export async function getCachedTeamsByOrganization(
  organizationId: string
): Promise<TeamDto[]> {
  "use cache: private";
  cacheTag(CacheTags.teamsByOrg(organizationId));

  const teams = await TeamService.getTeamsByOrganization(organizationId);

  if (teams.isOk()) {
    // Map Better Auth Team[] to TeamDto[]
    return teams.value.map((team) => ({
      id: team.id,
      departmentId: null, // Better Auth doesn't support departments
      organizationId: team.organizationId,
      name: team.name,
      description: null, // Better Auth doesn't support description
      createdAt: team.createdAt,
      updatedAt: team.updatedAt ?? team.createdAt,
    }));
  }

  return [];
}

/**
/**
 * Get team by ID (cached)
 * Calls TeamService which includes business logic and auth checks
 */
export async function getCachedTeamById(id: string): Promise<TeamDto | null> {
  "use cache: private";
  cacheTag(CacheTags.team(id));

  const team = await TeamService.getTeamById(id);

  if (team.isOk() && team.value) {
    // Map Better Auth Team to TeamDto
    return {
      id: team.value.id,
      departmentId: null, // Better Auth doesn't support departments
      organizationId: team.value.organizationId,
      name: team.value.name,
      description: null, // Better Auth doesn't support description
      createdAt: team.value.createdAt,
      updatedAt: team.value.updatedAt ?? team.value.createdAt,
    };
  }

  return null;
}

/**
 * Get user teams (cached)
 * Calls TeamService which includes business logic and auth checks
 */
export async function getCachedUserTeams(
  userId: string,
  organizationId: string
): Promise<UserTeamRoleDto[]> {
  "use cache: private";
  cacheTag(CacheTags.userTeams(userId, organizationId));

  const userTeams = await TeamService.getUserTeams(userId);

  if (userTeams.isOk()) {
    // Map Better Auth TeamMember[] to UserTeamRoleDto[]
    return userTeams.value.map((member) => ({
      userId: member.userId,
      teamId: member.teamId,
      role: "member" as const, // Better Auth doesn't support roles for team members
      joinedAt: member.createdAt ?? new Date(),
    }));
  }

  return [];
}

