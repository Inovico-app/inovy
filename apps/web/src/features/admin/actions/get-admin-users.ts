"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getOrganizationMembers } from "@/server/data-access/organization.queries";
import { z } from "zod";

export interface AdminUser {
  id: string;
  email: string | null;
  given_name: string | null;
  family_name: string | null;
  roles?: string[];
}

/**
 * Server action to get all users for admin panel
 * Only accessible to admins
 */
export const getAdminUsers = authorizedActionClient
  .metadata({ policy: "admin:all" })
  .inputSchema(z.object({}))
  .action(async (): Promise<AdminUser[]> => {
    try {
      const authResult = await getAuthSession();

      if (
        authResult.isErr() ||
        !authResult.value.isAuthenticated ||
        !authResult.value.organization
      ) {
        throw new Error("Authentication or organization required");
      }

      const { organization } = authResult.value;
      const users = await getOrganizationMembers(organization.orgCode);

      return users.map((user) => ({
        id: user.id,
        email: user.email,
        given_name: user.given_name,
        family_name: user.family_name,
        roles: user.roles,
      }));
    } catch (error) {
      logger.error("Failed to get admin users", {}, error as Error);
      throw new Error("Failed to fetch users");
    }
  });

