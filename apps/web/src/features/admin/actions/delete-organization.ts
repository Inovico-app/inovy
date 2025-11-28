"use server";

import { auth } from "@/lib/auth";
import { CacheInvalidation } from "@/lib/cache-utils";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { headers } from "next/headers";
import { err, ok } from "neverthrow";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Delete an organization
 * Only superadmins can delete organizations
 */
export const deleteOrganization = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("organizations:delete"),
  })
  .inputSchema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    const { id } = parsedInput;

    try {
      // Use Better Auth API to delete organization
      const result = await auth.api.deleteOrganization({
        headers: await headers(),
        body: {
          organizationId: id,
        },
      });

      if (!result) {
        return resultToActionResponse(
          err(
            ActionErrors.internal(
              "Failed to delete organization",
              undefined,
              "deleteOrganization"
            )
          )
        );
      }

      // Invalidate cache
      CacheInvalidation.invalidateOrganizations();
      CacheInvalidation.invalidateOrganization(id);

      // Revalidate Next.js route cache
      revalidatePath("/admin/organizations");

      return resultToActionResponse(ok({ success: true }));
    } catch (error) {
      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to delete organization",
            error as Error,
            "deleteOrganization"
          )
        )
      );
    }
  });

