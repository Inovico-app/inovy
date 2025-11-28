"use server";

import { logger } from "@/lib/logger";
import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { isOrganizationAdmin } from "@/lib/rbac/rbac";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { OrganizationSettingsService } from "@/server/services/organization-settings.service";
import { RAGService } from "@/server/services/rag/rag.service";
import { updateOrganizationSettingsSchema } from "@/server/validation/organization-settings.validation";
import { z } from "zod";

/**
 * Get organization settings - accessible to all organization members
 */
export const getOrganizationSettings = authorizedActionClient
  .metadata({ permissions: policyToPermissions("settings:read") })
  .schema(z.void())
  .action(async ({ ctx }) => {
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    const result =
      await OrganizationSettingsService.getOrganizationSettings(organizationId);

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "get-organization-settings"
      );
    }

    return result.value;
  });

/**
 * Update organization settings - admin only
 */
export const updateOrganizationSettings = authorizedActionClient
  .metadata({ permissions: policyToPermissions("settings:update") })
  .schema(updateOrganizationSettingsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId, user } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    // Check if user is admin
    if (!isOrganizationAdmin(user)) {
      throw ActionErrors.forbidden(
        "You must be an administrator to update organization settings"
      );
    }

    // Verify organizationId matches using centralized helper
    try {
      assertOrganizationAccess(
        parsedInput.organizationId,
        organizationId,
        "updateOrganizationSettings"
      );
    } catch (error) {
      throw ActionErrors.forbidden("Organization ID mismatch");
    }

    const result = await OrganizationSettingsService.updateOrganizationSettings(
      organizationId,
      parsedInput.instructions,
      user.id
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "update-organization-settings"
      );
    }

    // Trigger embedding reindex in background
    // Using void to fire and forget - errors will be logged by the service
    const ragService = new RAGService();
    ragService
      .reindexOrganizationInstructions(
        organizationId,
        parsedInput.instructions,
        result.value.id
      )
      .then((indexResult) => {
        if (indexResult.isErr()) {
          logger.error(
            "Failed to reindex organization instructions after update",
            { orgCode: organizationId },
            indexResult.error as unknown as Error
          );
        } else {
          logger.info("Successfully reindexed organization instructions", {
            orgCode: organizationId,
          });
        }
      });

    return result.value;
  });

