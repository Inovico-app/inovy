"use cache";

import { err, ok } from "neverthrow";
import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { AuthService } from "@/lib/kinde-api";
import { logger } from "@/lib/logger";
import { ActionErrors, type ActionResult } from "@/lib/action-errors";
import type { KindeOrganizationUserDto } from "../dto/kinde.dto";
import type { OrganizationInstructionsDto } from "../dto/organization-settings.dto";
import { OrganizationSettingsQueries } from "../data-access/organization-settings.queries";

/**
 * Cached organization queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get organization users (cached)
 * Fetches from Kinde Management API via AuthService
 */
export async function getCachedOrganizationUsers(
  orgCode: string
): Promise<ActionResult<KindeOrganizationUserDto[]>> {
  "use cache";
  cacheTag(CacheTags.orgMembers(orgCode));

  try {
    const Organizations = await AuthService.getOrganizations();
    const response = await Organizations.getOrganizationUsers({
      orgCode,
    });

    if (!response?.organization_users) {
      return ok([]);
    }

    const users: KindeOrganizationUserDto[] = response.organization_users.map(
      (user) => ({
        id: user.id || "",
        email: user.email || null,
        given_name: user.first_name || null,
        family_name: user.last_name || null,
        roles: user.roles || [],
      })
    );

    return ok(users);
  } catch (error) {
    logger.error(
      "Failed to get users for organization",
      { orgCode },
      error as Error
    );
    return err(
      ActionErrors.internal(
        "Failed to get users for organization",
        error as Error,
        "getCachedOrganizationUsers"
      )
    );
  }
}

/**
 * Get organization instructions (cached)
 * Fetches from the database with Next.js cache
 */
export async function getCachedOrganizationInstructions(
  orgCode: string
): Promise<ActionResult<OrganizationInstructionsDto | null>> {
  "use cache";
  cacheTag(CacheTags.organizationInstructions(orgCode));

  try {
    const instructions =
      await OrganizationSettingsQueries.getInstructionsByOrganizationId(
        orgCode
      );

    return ok(instructions);
  } catch (error) {
    logger.error(
      "Failed to get organization instructions",
      { orgCode },
      error as Error
    );
    return err(
      ActionErrors.internal(
        "Failed to get organization instructions",
        error as Error,
        "getCachedOrganizationInstructions"
      )
    );
  }
}

