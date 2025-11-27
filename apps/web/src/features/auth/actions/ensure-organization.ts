"use server";

import { OrganizationAssignmentService } from "@/server/services/organization-assignment.service";
import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * Server action to ensure user has an organization assigned
 * Called on initial login or whenever organization is missing
 */
export async function ensureUserOrganization(): Promise<{
  success: boolean;
  organizationCode?: string;
  error?: string;
}> {
  try {
    // Get current auth session
    const authResult = await getAuthSession();

    if (authResult.isErr()) {
      logger.error("Failed to get auth session in ensureUserOrganization", {
        error: authResult.error,
      });

      return {
        success: false,
        error: "Failed to authenticate",
      };
    }

    const { isAuthenticated, user } = authResult.value;

    if (!isAuthenticated || !user) {
      logger.warn("User not authenticated in ensureUserOrganization");
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    // Check if user already has an organization
    if (user.organization_code) {
      logger.info("User already has organization", {
        userId: user.id,
        organizationCode: user.organization_code,
      });

      return {
        success: true,
        organizationCode: user.organization_code,
      };
    }

    // User doesn't have organization, ensure one is assigned
    logger.info("User missing organization, ensuring assignment", {
      userId: user.id,
    });

    const assignmentResult = await OrganizationAssignmentService.ensureUserOrganization(user);

    if (assignmentResult.isErr()) {
      logger.error("Failed to ensure user organization", {
        userId: user.id,
        error: assignmentResult.error.message,
      });

      return {
        success: false,
        error: assignmentResult.error.message || "Failed to assign organization",
      };
    }

    const organization = assignmentResult.value;

    logger.info("Successfully ensured user organization", {
      userId: user.id,
      organizationId: organization.id,
    });

    return {
      success: true,
      organizationCode: organization.id, // organizationCode is the Better Auth organization ID
    };
  } catch (error) {
    logger.error("Unexpected error in ensureUserOrganization", {}, error as Error);

    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
