"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { KindeUserService } from "@/server/services";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

/**
 * Server action to get users from the authenticated user's organization
 * Used for populating assignee dropdowns
 */
export const getOrganizationUsers = authorizedActionClient
  .metadata({ policy: "users:read" })
  .schema(z.object({})) // No input needed
  .action(async () => {
    // Get the user's organization
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      throw new Error("Authentication or organization required");
    }

    const { organization } = authResult.value;
    
    const result = await KindeUserService.getUsersByOrganization(
      organization.orgCode
    );
    
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    
    return result.value;
  });

