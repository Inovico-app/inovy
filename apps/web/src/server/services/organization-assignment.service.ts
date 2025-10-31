import { type Result, err, ok } from "neverthrow";
import { ActionErrors, type ActionError } from "../../lib/action-errors";
import { logger } from "../../lib/logger";
import type { AuthUser } from "../../lib/auth";
import type { KindeOrganizationDto } from "../dto";
import { KindeOrganizationService } from "./kinde-organization.service";
import { KindeUserService } from "./kinde-user.service";

/**
 * Service for handling user organization assignment
 * Ensures users are assigned to organizations on first login
 */
export class OrganizationAssignmentService {
  /**
   * Get or create default organization for a user
   * Creates a new organization if none exists, assigns user to it
   */
  static async ensureUserOrganization(
    user: AuthUser
  ): Promise<Result<KindeOrganizationDto, ActionError>> {
    try {
      // First, get all organizations for the user
      if (!user.organization_code) {
        logger.warn("User has no organization_code in auth session", {
          userId: user.id,
          email: user.email,
        });

        // Try to create a default organization for the user
        return await this.createDefaultOrganizationForUser(user);
      }

      // User already has an organization, fetch it to verify
      const orgResult = await KindeOrganizationService.getOrganizationById(
        user.organization_code
      );

      if (orgResult.isErr()) {
        logger.error("Failed to fetch user organization", {
          userId: user.id,
          organizationCode: user.organization_code,
          error: orgResult.error,
        });

        return err(
          ActionErrors.internal(
            "Failed to fetch organization information",
            undefined,
            "ensureUserOrganization"
          )
        );
      }

      if (!orgResult.value) {
        logger.warn("Organization not found, creating default", {
          userId: user.id,
          organizationCode: user.organization_code,
        });

        return await this.createDefaultOrganizationForUser(user);
      }

      logger.info("User organization verified", {
        userId: user.id,
        organizationCode: user.organization_code,
      });

      return ok(orgResult.value);
    } catch (error) {
      logger.error("Error in ensureUserOrganization", { userId: user.id }, error as Error);

      return err(
        ActionErrors.internal(
          "Failed to ensure user organization",
          error as Error,
          "ensureUserOrganization"
        )
      );
    }
  }

  /**
   * Create a default organization for a user and assign them to it
   */
  private static async createDefaultOrganizationForUser(
    user: AuthUser
  ): Promise<Result<KindeOrganizationDto, ActionError>> {
    try {
      // Generate organization code and name from user email
      const emailLocal = user.email.split("@")[0] || "user";
      const timestamp = Date.now().toString().slice(-6);
      const orgCode = `org-${emailLocal}-${timestamp}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const orgName = `${user.given_name || user.email}'s Organization`;

      logger.info("Creating default organization for user", {
        userId: user.id,
        orgCode,
        orgName,
      });

      // Create organization in Kinde
      const createOrgResult = await KindeOrganizationService.createOrganization({
        name: orgName,
      });

      if (createOrgResult.isErr()) {
        logger.error("Failed to create default organization", {
          userId: user.id,
          error: createOrgResult.error,
        });

        return err(
          ActionErrors.internal(
            "Failed to create organization",
            undefined,
            "createDefaultOrganizationForUser"
          )
        );
      }

      const newOrganization = createOrgResult.value;

      // Assign user to the new organization
      const assignResult = await KindeUserService.addUserToOrganization(
        user.id,
        newOrganization.code
      );

      if (assignResult.isErr()) {
        logger.error("Failed to assign user to organization", {
          userId: user.id,
          organizationCode: newOrganization.code,
          error: assignResult.error,
        });

        return err(
          ActionErrors.internal(
            "Failed to assign user to organization",
            undefined,
            "createDefaultOrganizationForUser"
          )
        );
      }

      logger.info("Successfully created and assigned organization to user", {
        userId: user.id,
        organizationCode: newOrganization.code,
      });

      return ok(newOrganization);
    } catch (error) {
      logger.error("Error creating default organization", { userId: user.id }, error as Error);

      return err(
        ActionErrors.internal(
          "Failed to create default organization",
          error as Error,
          "createDefaultOrganizationForUser"
        )
      );
    }
  }
}
