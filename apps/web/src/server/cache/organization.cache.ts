"use cache";

import { CacheTags } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { err, ok } from "neverthrow";
import { cacheTag } from "next/cache";
import { OrganizationSettingsQueries } from "../data-access/organization-settings.queries";
import { OrganizationQueries } from "../data-access/organization.queries";
import type { OrganizationSettingsDto } from "../dto/organization-settings.dto";
import type { OrganizationMemberDto } from "../services/organization.service";

/**
 * Cached organization queries
 * Uses Next.js 16 cache with tags for invalidation
 * Uses DAL (Data Access Layer) for database operations
 */

/**
 * Organization DTO for list view
 */
export interface OrganizationListDto {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: Date;
  memberCount: number;
}

/**
 * Organization detail DTO
 */
export interface OrganizationDetailDto {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: Date;
  metadata: string | null;
}

/**
 * Get organization members (cached)
 * Uses DAL for data access
 */
export async function getCachedOrganizationMembers(organizationId: string) {
  "use cache";
  cacheTag(CacheTags.orgMembers(organizationId));

  try {
    // Use DAL to get members
    const membersResult =
      await OrganizationQueries.getMembersDirect(organizationId);

    if (membersResult.length === 0) {
      return [];
    }

    // Map Better Auth member format to our expected format
    const mappedMembers: OrganizationMemberDto[] = membersResult.map((m) => {
      const roles = m.role ? [m.role] : [];
      const nameParts = m.name?.split(" ") ?? [];
      const given_name = nameParts[0] ?? null;
      const family_name = nameParts.slice(1).join(" ") || null;

      return {
        id: m.id,
        email: m.email ?? null,
        given_name,
        family_name,
        roles,
      };
    });

    return mappedMembers;
  } catch (error) {
    logger.error(
      "Failed to get members for organization",
      { organizationId },
      error as Error
    );
    return [];
  }
}

/**
 * Get organization instructions (cached)
 * Fetches from the database with Next.js cache
 */
export async function getCachedOrganizationInstructions(
  organizationId: string
): Promise<ActionResult<OrganizationSettingsDto | null>> {
  "use cache";
  cacheTag(CacheTags.organizationInstructions(organizationId));

  try {
    const instructions =
      await OrganizationSettingsQueries.findByOrganizationId(organizationId);

    return ok(instructions);
  } catch (error) {
    logger.error(
      "Failed to get organization instructions",
      { organizationId },
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

/**
 * Get all organizations (cached)
 * Uses DAL for data access
 * For superadmin use only
 */
export async function getCachedAllOrganizations(): Promise<
  OrganizationListDto[]
> {
  "use cache";
  cacheTag(CacheTags.organizations());

  try {
    // Use DAL to get all organizations with member counts
    const orgsWithCounts = await OrganizationQueries.findAllWithMemberCounts();

    return orgsWithCounts;
  } catch (error) {
    logger.error("Failed to get all organizations", {}, error as Error);
    return [];
  }
}

/**
 * Get organization by ID (cached)
 * Uses DAL for data access
 * For superadmin use only
 */
export async function getCachedOrganizationById(organizationId: string) {
  "use cache";
  cacheTag(CacheTags.organization(organizationId));

  try {
    // Use DAL to get organization by ID
    const org = await OrganizationQueries.findByIdDirect(organizationId);

    if (!org) {
      return null;
    }

    return org;
  } catch (error) {
    logger.error(
      "Failed to get organization by ID",
      { organizationId },
      error as Error
    );
    return null;
  }
}

