"use server";

import { db } from "@/server/db";
import { organizations } from "@/server/db/schema/auth";
import { OrganizationQueries } from "@/server/data-access/organization.queries";
import { CacheTags, invalidateCache } from "@/lib/cache-utils";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { err, ok } from "neverthrow";
import { eq } from "drizzle-orm";
import { z } from "zod";

/**
 * Cancel a scheduled organization deletion.
 *
 * Clears scheduledDeletionAt and deletionRequestedById, restoring the
 * organization to its normal active state.
 *
 * Only superadmins can cancel scheduled organization deletions.
 */
export const cancelOrganizationDeletion = authorizedActionClient
  .metadata({
    name: "cancel-organization-deletion",
    permissions: policyToPermissions("organizations:delete"),
    audit: {
      resourceType: "organization",
      action: "cancel_deletion",
      category: "mutation",
    },
  })
  .inputSchema(
    z.object({
      organizationId: z.string().uuid(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const { organizationId } = parsedInput;

    const org = await OrganizationQueries.findByIdDirect(organizationId);

    if (!org) {
      return resultToActionResponse(
        err(
          ActionErrors.notFound("Organization", "cancelOrganizationDeletion"),
        ),
      );
    }

    if (org.scheduledDeletionAt === null) {
      return resultToActionResponse(
        err(
          ActionErrors.badRequest(
            "Organization is not scheduled for deletion",
            "cancelOrganizationDeletion",
          ),
        ),
      );
    }

    try {
      await db
        .update(organizations)
        .set({
          scheduledDeletionAt: null,
          deletionRequestedById: null,
        })
        .where(eq(organizations.id, organizationId));

      invalidateCache(
        CacheTags.organization(organizationId),
        CacheTags.organizations(),
      );

      return resultToActionResponse(ok({ success: true }));
    } catch (error) {
      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to cancel organization deletion",
            error as Error,
            "cancelOrganizationDeletion",
          ),
        ),
      );
    }
  });
