"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/action-client";
import { policyToPermissions } from "@/lib/permission-helpers";
import { ActionErrors } from "@/lib/action-errors";
import { OrganizationSettingsService } from "@/server/services/organization-settings.service";
import {
  createOrganizationInstructionsSchema,
  updateOrganizationInstructionsSchema,
} from "@/server/validation/organization/organization-instructions";

/**
 * Create organization instructions using Result types throughout
 * Admin-only action for creating organization-wide AI guidelines
 */
export const createOrganizationInstructionsAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("org:instructions:write"),
  })
  .inputSchema(createOrganizationInstructionsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { instructions } = parsedInput;
    const { user } = ctx;

    if (!user || !user.organization_code) {
      throw ActionErrors.unauthenticated(
        "User or organization code not found in context",
        "create-organization-instructions"
      );
    }
    // Create instructions
    const result = await OrganizationSettingsService.createInstructions(
      instructions,
      user.organization_code,
      user
    );

    // Convert Result to action response (throws if error)
    return resultToActionResponse(result);
  });

/**
 * Update organization instructions using Result types throughout
 * Admin-only action for updating organization-wide AI guidelines
 */
export const updateOrganizationInstructionsAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("org:instructions:write"),
  })
  .inputSchema(updateOrganizationInstructionsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { instructions } = parsedInput;
    const { user } = ctx;

    if (!user || !user.organization_code) {
      throw ActionErrors.unauthenticated(
        "User or organization code not found in context",
        "update-organization-instructions"
      );
    }

    // Update instructions
    const result = await OrganizationSettingsService.updateInstructions(
      instructions,
      user.organization_code
    );

    // Convert Result to action response (throws if error)
    return resultToActionResponse(result);
  });

