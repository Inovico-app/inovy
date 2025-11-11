"use server";

import { AuthService } from "@/lib/kinde-api";
import { authorizedActionClient } from "@/lib/action-client";
import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type { KindeOrganizationUserDto } from "@/server/dto/kinde.dto";

/**
 * Server action to get users from the authenticated user's organization
 * Used for populating assignee dropdowns
 */
export const getOrganizationUsers = authorizedActionClient
  .metadata({ policy: "users:read" })
  .schema(z.object({})) // No input needed
  .action(async (): Promise<KindeOrganizationUserDto[]> => {
    // Get the user's organization
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      throw new Error("Authentication or organization required");
    }

    const { organization } = authResult.value;

    try {
      const Organizations = await AuthService.getOrganizations();
      const response = await Organizations.getOrganizationUsers({
        orgCode: organization.orgCode,
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
        { orgCode: organization.orgCode },
        error as Error
      );
      throw new Error("Failed to fetch organization users");
    }
  });

