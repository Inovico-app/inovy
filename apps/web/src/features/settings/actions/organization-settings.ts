"use server";

import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { isOrganizationAdmin } from "@/lib/rbac";
import type { OrganizationSettingsDto } from "@/server/dto";
import { EmbeddingService } from "@/server/services/embedding.service";
import { OrganizationSettingsService } from "@/server/services/organization-settings.service";
import {
  updateOrganizationSettingsSchema,
  type UpdateOrganizationSettingsInput,
} from "@/server/validation/organization-settings.validation";

/**
 * Get organization settings - accessible to all organization members
 */
export async function getOrganizationSettings(): Promise<{
  success: boolean;
  data?: OrganizationSettingsDto | null;
  error?: string;
}> {
  try {
    const sessionResult = await getAuthSession();

    if (sessionResult.isErr() || !sessionResult.value.user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const { organization } = sessionResult.value;

    if (!organization) {
      return {
        success: false,
        error: "Organization not found",
      };
    }

    const result = await OrganizationSettingsService.getOrganizationSettings(
      organization.orgCode
    );

    if (result.isErr()) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      data: result.value,
    };
  } catch (error) {
    logger.error(
      "Unexpected error in getOrganizationSettings",
      {},
      error as Error
    );
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Update organization settings - admin only
 */
export async function updateOrganizationSettings(
  input: UpdateOrganizationSettingsInput
): Promise<{
  success: boolean;
  data?: OrganizationSettingsDto;
  error?: string;
}> {
  try {
    const validatedData = updateOrganizationSettingsSchema.parse(input);

    const sessionResult = await getAuthSession();

    if (sessionResult.isErr() || !sessionResult.value.user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const { user, organization } = sessionResult.value;

    if (!organization) {
      return {
        success: false,
        error: "Organization not found",
      };
    }

    // Check if user is admin
    if (!isOrganizationAdmin(user)) {
      return {
        success: false,
        error: "You must be an administrator to update organization settings",
      };
    }

    // Verify organizationId matches
    if (validatedData.organizationId !== organization.orgCode) {
      return {
        success: false,
        error: "Organization ID mismatch",
      };
    }

    const result = await OrganizationSettingsService.updateOrganizationSettings(
      organization.orgCode,
      validatedData.instructions,
      user.id
    );

    if (result.isErr()) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    // Trigger embedding reindex in background
    // Using void to fire and forget - errors will be logged by the service
    EmbeddingService.reindexOrganizationInstructions(
      organization.orgCode,
      validatedData.instructions,
      result.value.id
    ).then((indexResult) => {
      if (indexResult.isErr()) {
        logger.error(
          "Failed to reindex organization instructions after update",
          { orgCode: organization.orgCode },
          indexResult.error as Error
        );
      } else {
        logger.info("Successfully reindexed organization instructions", {
          orgCode: organization.orgCode,
        });
      }
    });

    return {
      success: true,
      data: result.value,
    };
  } catch (error) {
    logger.error(
      "Unexpected error in updateOrganizationSettings",
      {},
      error as Error
    );
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

