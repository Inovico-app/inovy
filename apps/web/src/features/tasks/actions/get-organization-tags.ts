"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { TaskTagsQueries } from "@/server/data-access";
import { getAuthSession } from "@/lib/auth";
import { z } from "zod";

/**
 * Server action to get all tags for the organization
 */
export const getOrganizationTags = authorizedActionClient
  .metadata({ policy: "tasks:read" })
  .schema(z.void())
  .action(async () => {
    const authResult = await getAuthSession();
    
    if (authResult.isErr() || !authResult.value.organization) {
      throw new Error("Authentication required");
    }
    
    const { organization } = authResult.value;
    const result = await TaskTagsQueries.getTagsByOrganization(organization.orgCode);
    
    if (result.isErr()) {
      throw new Error("Failed to fetch tags");
    }
    
    return result.value;
  });

