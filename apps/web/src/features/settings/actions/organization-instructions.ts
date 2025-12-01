"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
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
    const { user, organizationId } = ctx;

    if (!user || !organizationId) {
      throw ActionErrors.unauthenticated(
        "User or organization not found in context",
        "create-organization-instructions"
      );
    }
    // Create instructions
    const result = await OrganizationSettingsService.createInstructions(
      instructions,
      organizationId,
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
    const { user, organizationId } = ctx;

    if (!user || !organizationId) {
      throw ActionErrors.unauthenticated(
        "User or organization not found in context",
        "update-organization-instructions"
      );
    }

    // Update instructions
    const result = await OrganizationSettingsService.updateInstructions(
      instructions,
      organizationId
    );

    // Convert Result to action response (throws if error)
    return resultToActionResponse(result);
  });

