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

const DELETION_DAYS = 7;

/**
 * Schedule an organization for deletion.
 *
 * Sets scheduledDeletionAt to now + 7 days and records who requested it.
 * The actual deletion is executed by a cron job when the scheduled time arrives.
 *
 * Only superadmins can schedule organizations for deletion.
 */
export const scheduleOrganizationDeletion = authorizedActionClient
  .metadata({
    name: "schedule-organization-deletion",
    permissions: policyToPermissions("organizations:delete"),
    audit: {
      resourceType: "organization",
      action: "schedule_deletion",
      category: "mutation",
    },
  })
  .inputSchema(
    z.object({
      organizationId: z.string().uuid(),
      confirmName: z.string().min(1, "Confirmation name is required"),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId, confirmName } = parsedInput;

    if (!ctx.user) {
      return resultToActionResponse(
        err(
          ActionErrors.unauthenticated(
            "User context required",
            "scheduleOrganizationDeletion",
          ),
        ),
      );
    }

    if (
      ctx.organizationId &&
      ctx.organizationId !== organizationId &&
      ctx.user.role !== "superadmin"
    ) {
      return resultToActionResponse(
        err(
          ActionErrors.forbidden(
            "Cannot schedule deletion for another organization",
            undefined,
            "scheduleOrganizationDeletion",
          ),
        ),
      );
    }

    const org = await OrganizationQueries.findByIdDirect(organizationId);

    if (!org) {
      return resultToActionResponse(
        err(
          ActionErrors.notFound("Organization", "scheduleOrganizationDeletion"),
        ),
      );
    }

    if (confirmName !== org.name) {
      return resultToActionResponse(
        err(
          ActionErrors.validation(
            "Confirmation name does not match organization name",
            { context: "scheduleOrganizationDeletion" },
          ),
        ),
      );
    }

    if (org.scheduledDeletionAt !== null) {
      return resultToActionResponse(
        err(
          ActionErrors.conflict(
            "Organization is already scheduled for deletion",
            "scheduleOrganizationDeletion",
          ),
        ),
      );
    }

    const scheduledDeletionAt = new Date(
      Date.now() + DELETION_DAYS * 24 * 60 * 60 * 1000,
    );

    try {
      await db
        .update(organizations)
        .set({
          scheduledDeletionAt,
          deletionRequestedById: ctx.user.id,
        })
        .where(eq(organizations.id, organizationId));

      invalidateCache(
        CacheTags.organization(organizationId),
        CacheTags.organizations(),
      );

      return resultToActionResponse(ok({ success: true, scheduledDeletionAt }));
    } catch (error) {
      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to schedule organization deletion",
            error as Error,
            "scheduleOrganizationDeletion",
          ),
        ),
      );
    }
  });
