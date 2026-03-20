/**
 * Team Isolation Utilities
 * Provides centralized helpers for enforcing team-level data isolation.
 * Mirrors the organization-isolation.ts pattern.
 */

import type { Column, SQL } from "drizzle-orm";
import { eq, inArray, isNull, or } from "drizzle-orm";
import { logger } from "../logger";
import { ActionErrors } from "../server-action-client/action-errors";
import { isOrganizationAdmin } from "./rbac";
import type { BetterAuthUser } from "../auth";

/**
 * Build Drizzle WHERE conditions for team-scoped queries.
 *
 * Logic:
 * - Org admin: no team filter (sees everything in org)
 * - Active team set: teamId = activeTeamId OR teamId IS NULL (org-wide)
 * - "All Teams" (null): teamId IN userTeamIds OR teamId IS NULL
 * - No teams: teamId IS NULL only
 */
export function buildTeamFilter(
  teamIdColumn: Column,
  activeTeamId: string | null | undefined,
  userTeamIds: string[],
  user: BetterAuthUser,
): SQL | undefined {
  // Org admins bypass team filtering
  if (isOrganizationAdmin(user)) {
    return undefined;
  }

  // Active team selected — show that team's resources + org-wide
  if (activeTeamId) {
    return or(eq(teamIdColumn, activeTeamId), isNull(teamIdColumn));
  }

  // "All Teams" — show user's teams + org-wide
  if (userTeamIds.length > 0) {
    return or(inArray(teamIdColumn, userTeamIds), isNull(teamIdColumn));
  }

  // User has no teams — only org-wide resources
  return isNull(teamIdColumn);
}

/**
 * Assert that a user can access a resource's team.
 * Returns 404 (not 403) to prevent information leakage.
 * Org admins always pass.
 *
 * @param resourceTeamId - The team ID on the resource (null = org-wide)
 * @param userTeamIds - The user's team memberships
 * @param user - The authenticated user
 * @param context - Logging context
 */
export function assertTeamAccess(
  resourceTeamId: string | null | undefined,
  userTeamIds: string[],
  user: BetterAuthUser,
  context?: string,
): void {
  // Org-wide resources are accessible to all org members
  if (!resourceTeamId) {
    return;
  }

  // Org admins bypass team checks
  if (isOrganizationAdmin(user)) {
    return;
  }

  // Check if user is a member of the resource's team
  if (userTeamIds.includes(resourceTeamId)) {
    return;
  }

  logger.warn("Team access denied", {
    component: context ?? "assertTeamAccess",
    resourceTeamId,
    userTeamIds,
    reason: "User is not a member of the resource's team",
  });

  // Return 404 to prevent information leakage
  throw ActionErrors.notFound(
    "Resource not found",
    context ?? "assertTeamAccess",
  );
}
