"use cache";

import { CacheTags } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { db } from "@/server/db";
import { members, organizations, users } from "@/server/db/schema/auth";
import { eq } from "drizzle-orm";
import { err, ok } from "neverthrow";
import { cacheTag } from "next/cache";
import { OrganizationSettingsQueries } from "../data-access/organization-settings.queries";
import type { OrganizationSettingsDto } from "../dto/organization-settings.dto";
import type { OrganizationMemberDto } from "../services/organization.service";

/**
 * Cached organization queries
 * Uses Next.js 16 cache with tags for invalidation
 * Queries Better Auth database tables directly
 */

/**
 * Get organization members (cached)
 * Queries Better Auth member and user tables directly
 */
export async function getCachedOrganizationMembers(
  organizationId: string
): Promise<ActionResult<OrganizationMemberDto[]>> {
  "use cache";
  cacheTag(CacheTags.orgMembers(organizationId));

  try {
    // Query organization members directly from Better Auth tables
    const membersResult = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: members.role,
      })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.organizationId, organizationId));

    if (membersResult.length === 0) {
      return ok([]);
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

    return ok(mappedMembers);
  } catch (error) {
    logger.error(
      "Failed to get members for organization",
      { organizationId },
      error as Error
    );
    return err(
      ActionErrors.internal(
        "Failed to get members for organization",
        error as Error,
        "getCachedOrganizationMembers"
      )
    );
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
 * Get all organizations (cached)
 * For superadmin use only
 */
export async function getCachedAllOrganizations(): Promise<
  ActionResult<OrganizationListDto[]>
> {
  "use cache";
  cacheTag(CacheTags.organizations());

  try {
    // Query all organizations with member counts
    const orgsResult = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        createdAt: organizations.createdAt,
      })
      .from(organizations);

    // Get member counts for each organization
    const orgsWithCounts = await Promise.all(
      orgsResult.map(async (org) => {
        const memberCountResult = await db
          .select()
          .from(members)
          .where(eq(members.organizationId, org.id));

        return {
          ...org,
          memberCount: memberCountResult.length,
        };
      })
    );

    return ok(orgsWithCounts);
  } catch (error) {
    logger.error("Failed to get all organizations", {}, error as Error);
    return err(
      ActionErrors.internal(
        "Failed to get all organizations",
        error as Error,
        "getCachedAllOrganizations"
      )
    );
  }
}

/**
 * Get organization by ID (cached)
 * For superadmin use only
 */
export async function getCachedOrganizationById(
  organizationId: string
): Promise<ActionResult<OrganizationDetailDto | null>> {
  "use cache";
  cacheTag(CacheTags.organization(organizationId));

  try {
    const orgResult = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        createdAt: organizations.createdAt,
        metadata: organizations.metadata,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (orgResult.length === 0) {
      return ok(null);
    }

    return ok(orgResult[0]);
  } catch (error) {
    logger.error(
      "Failed to get organization by ID",
      { organizationId },
      error as Error
    );
    return err(
      ActionErrors.internal(
        "Failed to get organization by ID",
        error as Error,
        "getCachedOrganizationById"
      )
    );
  }
}

