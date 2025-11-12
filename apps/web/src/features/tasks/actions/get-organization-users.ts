"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { AuthService } from "@/lib/kinde-api";
import { logger } from "@/lib/logger";
import type { KindeOrganizationUserDto } from "@/server/dto/kinde.dto";
import { z } from "zod";

/**
 * Server action to get users from the authenticated user's organization
 * Used for populating assignee dropdowns
 */
export const getOrganizationUsers = authorizedActionClient
  .metadata({ policy: "users:read" })
  .schema(z.object({})) // No input needed
  .action(async ({ ctx }): Promise<KindeOrganizationUserDto[]> => {
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    try {
      const Organizations = await AuthService.getOrganizations();
      const response = await Organizations.getOrganizationUsers({
        orgCode: organizationId,
      });

      if (!response?.organization_users) {
        return [];
      }

      return response.organization_users.map((user) => ({
        id: user.id || "",
        email: user.email || null,
        given_name: user.first_name || null,
        family_name: user.last_name || null,
        roles: user.roles || [],
      }));
    } catch (error) {
      logger.error(
        "Failed to get organization users",
        { orgCode: organizationId },
        error as Error
      );
      throw new Error("Failed to fetch organization users");
    }
  });

