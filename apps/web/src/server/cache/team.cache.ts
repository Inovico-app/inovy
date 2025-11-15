"use cache";

import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { TeamService } from "../services/team.service";

/**
 * Cached team queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get teams by organization (cached)
 * Calls TeamService which includes business logic and auth checks
 */
export async function getCachedTeamsByOrganization(organizationId: string) {
  "use cache";
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
export async function getCachedTeamsByDepartment(departmentId: string) {
  "use cache";
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
export async function getCachedTeamById(id: string) {
  "use cache";
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
export async function getCachedUserTeams(userId: string, organizationId: string) {
  "use cache";
  cacheTag(CacheTags.userTeams(userId, organizationId));

  const userTeams = await TeamService.getUserTeams(userId);

  if (userTeams.isOk()) {
    return userTeams.value;
  }

  return [];
}

