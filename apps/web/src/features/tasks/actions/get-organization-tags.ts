"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { TaskService } from "@/server/services/task.service";
import { z } from "zod";

/**
 * Server action to get all tags for the organization
 */
export const getOrganizationTags = authorizedActionClient
  .metadata({ permissions: policyToPermissions("tasks:read") })
  .schema(z.void())
  .action(async ({ ctx }) => {
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    const result = await TaskService.getTagsByOrganization(organizationId);

    if (result.isErr()) {
      throw ActionErrors.internal(
        "Failed to fetch tags",
        result.error,
        "get-organization-tags"
      );
    }

    return result.value;
  });

