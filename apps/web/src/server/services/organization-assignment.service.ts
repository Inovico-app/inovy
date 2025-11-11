import { err, ok } from "neverthrow";
import { ActionErrors, type ActionResult } from "../../lib/action-errors";
import type { AuthUser } from "../../lib/auth";
import { AuthService } from "../../lib/kinde-api";
import { logger } from "../../lib/logger";
import type { KindeOrganizationDto } from "../dto";

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
  ): Promise<ActionResult<KindeOrganizationDto>> {
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
      try {
        const response = await AuthService.Organizations.getOrganization({
          code: user.organization_code,
        });

        if (!response) {
          logger.warn("Organization not found, creating default", {
            userId: user.id,
            organizationCode: user.organization_code,
          });

          return await this.createDefaultOrganizationForUser(user);
        }

        const organization: KindeOrganizationDto = {
          code: response.code ?? user.organization_code,
          name: response.name ?? "",
          is_default: response.is_default,
          created_on: response.created_on,
        };

        logger.info("User organization verified", {
          userId: user.id,
          organizationCode: user.organization_code,
        });

        return ok(organization);
      } catch (error) {
        logger.error("Failed to fetch user organization", {
          userId: user.id,
          organizationCode: user.organization_code,
          error,
        });

        return err(
          ActionErrors.internal(
            "Failed to fetch organization information",
            error as Error,
            "ensureUserOrganization"
          )
        );
      }
    } catch (error) {
      logger.error(
        "Error in ensureUserOrganization",
        { userId: user.id },
        error as Error
      );

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
  ): Promise<ActionResult<KindeOrganizationDto>> {
    try {
      // Generate organization code and name from user email
      const emailLocal = (user.email ?? "user").split("@")[0] ?? "user";
      const timestamp = Date.now().toString().slice(-6);
      const orgCode = `org-${emailLocal}-${timestamp}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-");
      const orgName = `${
        user.given_name ?? user.email ?? "User"
      }'s Organization`;

      logger.info("Creating default organization for user", {
        userId: user.id,
        orgCode,
        orgName,
      });

      // Create organization in Kinde
      try {
        const createOrgResponse =
          await AuthService.Organizations.createOrganization({
            requestBody: {
              name: orgName,
            },
          });

        if (!createOrgResponse?.organization?.code) {
          logger.error(
            "Failed to create default organization - no code returned",
            {
              userId: user.id,
            }
          );

          return err(
            ActionErrors.internal(
              "Failed to create organization",
              undefined,
              "createDefaultOrganizationForUser"
            )
          );
        }

        const newOrganization: KindeOrganizationDto = {
          code: createOrgResponse.organization.code,
          name: orgName,
          is_default: false,
        };

        // Assign user to the new organization
        try {
          await AuthService.Organizations.addOrganizationUsers({
            orgCode: newOrganization.code,
            requestBody: {
              users: [{ id: user.id }],
            },
          });

          logger.info(
            "Successfully created and assigned organization to user",
            {
              userId: user.id,
              organizationCode: newOrganization.code,
            }
          );

          return ok(newOrganization);
        } catch (error) {
          logger.error("Failed to assign user to organization", {
            userId: user.id,
            organizationCode: newOrganization.code,
            error,
          });

          return err(
            ActionErrors.internal(
              "Failed to assign user to organization",
              error as Error,
              "createDefaultOrganizationForUser"
            )
          );
        }
      } catch (error) {
        logger.error("Failed to create default organization", {
          userId: user.id,
          error,
        });

        return err(
          ActionErrors.internal(
            "Failed to create organization",
            error as Error,
            "createDefaultOrganizationForUser"
          )
        );
      }
    } catch (error) {
      logger.error(
        "Error creating default organization",
        { userId: user.id },
        error as Error
      );

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

