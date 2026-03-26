"use server";

import { logger } from "@/lib/logger";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { OrganizationAssignmentService } from "@/server/services/organization-assignment.service";

/**
 * Server action to ensure user has an organization assigned.
 * Called on initial login or whenever organization is missing.
 *
 * Uses empty permissions so middleware authenticates the user
 * but does NOT require an existing organization (needed for onboarding).
 */
export const ensureUserOrganizationAction = authorizedActionClient
  .metadata({
    name: "ensure-user-organization",
    permissions: {},
    audit: {
      resourceType: "organization",
      action: "ensure-organization",
      category: "mutation",
    },
  })
  .action(async ({ ctx }) => {
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "ensure-user-organization",
      );
    }

    // User already has an organization — return it
    if (organizationId) {
      logger.info("User already has organization", {
        component: "ensureUserOrganizationAction",
        userId: user.id,
        organizationId,
      });

      return { organizationCode: organizationId };
    }

    // User is missing an organization — ensure one is assigned
    logger.info("User missing organization, ensuring assignment", {
      component: "ensureUserOrganizationAction",
      userId: user.id,
    });

    const assignmentResult =
      await OrganizationAssignmentService.ensureUserOrganization(user);

    const assignedOrganization = resultToActionResponse(assignmentResult);

    logger.info("Successfully ensured user organization", {
      component: "ensureUserOrganizationAction",
      userId: user.id,
      organizationId: assignedOrganization.id,
    });

    // Set audit resource ID for the middleware
    ctx.audit?.setResourceId(assignedOrganization.id);

    return { organizationCode: assignedOrganization.id };
  });
