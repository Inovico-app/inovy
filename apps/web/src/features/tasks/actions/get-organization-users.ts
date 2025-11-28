"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { getOrganizationMembers } from "@/server/data-access/organization.queries";
import type { AuthOrganizationUserDto } from "@/server/dto/auth.dto";
import { z } from "zod";

/**
 * Server action to get users from the authenticated user's organization
 * Used for populating assignee dropdowns
 * Uses Better Auth organization member queries
 */
export const getOrganizationUsers = authorizedActionClient
  .metadata({ permissions: policyToPermissions("users:read") })
  .schema(z.object({})) // No input needed
  .action(async ({ ctx }): Promise<AuthOrganizationUserDto[]> => {
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    try {
      const members = await getOrganizationMembers(organizationId);

      return members.map((member) => ({
        id: member.id,
        email: member.email ?? null,
        given_name: member.given_name ?? null,
        family_name: member.family_name ?? null,
        roles: member.roles ?? [],
      }));
    } catch (error) {
      logger.error(
        "Failed to get organization users",
        { organizationId },
        error as Error
      );
      throw new Error("Failed to fetch organization users");
    }
  });

