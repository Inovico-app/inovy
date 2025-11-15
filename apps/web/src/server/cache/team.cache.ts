import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { TeamService } from "../services/team.service";
import type { TeamDto, UserTeamRoleDto } from "../dto/team.dto";

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
    return teams.value;
  }

  return [];
}

/**
 * Get teams by department (cached)
 * Calls TeamService which includes business logic and auth checks
 */
export async function getCachedTeamsByDepartment(
  departmentId: string
): Promise<TeamDto[]> {
  "use cache: private";
  cacheTag(CacheTags.teamsByDepartment(departmentId));

  const teams = await TeamService.getTeamsByDepartment(departmentId);

  if (teams.isOk()) {
    return teams.value;
  }

  return [];
}

/**
 * Get team by ID (cached)
 * Calls TeamService which includes business logic and auth checks
 */
export async function getCachedTeamById(id: string): Promise<TeamDto | null> {
  "use cache: private";
  cacheTag(CacheTags.team(id));

  const team = await TeamService.getTeamById(id);

  if (team.isOk()) {
    return team.value;
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
    return userTeams.value;
  }

  return [];
}

