"use cache";

import { err, ok } from "neverthrow";
import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { db } from "@/server/db";
import { member, user } from "@/server/db/schema/auth";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { ActionErrors, type ActionResult } from "@/lib/action-errors";
import type { OrganizationMemberDto } from "../services/organization.service";
import type { OrganizationSettingsDto } from "../dto/organization-settings.dto";
import { OrganizationSettingsQueries } from "../data-access/organization-settings.queries";

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
    const members = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: member.role,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, organizationId));

    if (members.length === 0) {
      return ok([]);
    }

    // Map Better Auth member format to our expected format
    const mappedMembers: OrganizationMemberDto[] = members.map((m) => {
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

