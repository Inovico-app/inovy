"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { getAuthSession } from "@/lib/auth";
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
    policy: "org:instructions:write",
  })
  .inputSchema(createOrganizationInstructionsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { instructions } = parsedInput;
    const { user, session } = ctx;

    if (!user || !session) {
      throw ActionErrors.unauthenticated(
        "User or session not found",
        "create-organization-instructions"
      );
    }

    // Get organization code from session
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      throw ActionErrors.internal(
        "Failed to get organization context",
        undefined,
        "create-organization-instructions"
      );
    }

    const orgCode = authResult.value.organization.orgCode;

    // Create instructions
    const result = await OrganizationSettingsService.createInstructions(
      instructions,
      orgCode,
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
    policy: "org:instructions:write",
  })
  .inputSchema(updateOrganizationInstructionsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { instructions } = parsedInput;
    const { user, session } = ctx;

    if (!user || !session) {
      throw ActionErrors.unauthenticated(
        "User or session not found",
        "update-organization-instructions"
      );
    }

    // Get organization code from session
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      throw ActionErrors.internal(
        "Failed to get organization context",
        undefined,
        "update-organization-instructions"
      );
    }

    const orgCode = authResult.value.organization.orgCode;

    // Update instructions
    const result = await OrganizationSettingsService.updateInstructions(
      instructions,
      orgCode
    );

    // Convert Result to action response (throws if error)
    return resultToActionResponse(result);
  });

