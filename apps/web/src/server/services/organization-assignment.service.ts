import { auth } from "@/lib/auth";
import type { BetterAuthUser } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { err, ok } from "neverthrow";
import { headers } from "next/headers";

/**
 * Better Auth organization DTO
 * Compatible with existing code that expects organization data
 */
export interface BetterAuthOrganizationDto {
  id: string;
  name: string;
  slug: string | null;
}

interface BetterAuthOrganizationResponse {
  id: string;
  name: string;
  slug?: string | null;
}

/**
 * Service for handling user organization assignment
 * Ensures users are assigned to organizations on first login
 * Uses Better Auth organization plugin
 */
export class OrganizationAssignmentService {
  /**
   * Get or create default organization for a user
   * Creates a new organization if none exists, assigns user to it
   */
  static async ensureUserOrganization(
    user: BetterAuthUser
  ): Promise<ActionResult<BetterAuthOrganizationDto>> {
    try {
      // Fetch user's organizations
      try {
        const organizationsResponse = await auth.api.listOrganizations({
          headers: await headers(),
        });

        // Better Auth API returns array directly
        const organizations = Array.isArray(organizationsResponse)
          ? (organizationsResponse as BetterAuthOrganizationResponse[])
          : [];

        if (organizations.length === 0) {
          logger.warn("User has no organizations, creating default", {
            userId: user.id,
          });

          // Try to create a default organization for the user
          return await this.createDefaultOrganizationForUser(user);
        }

        // Return first organization (or active organization if available)
        const userOrg = organizations[0];

        const organization: BetterAuthOrganizationDto = {
          id: userOrg.id,
          name: userOrg.name,
          slug: userOrg.slug ?? null,
        };

        logger.info("User organization verified", {
          userId: user.id,
          organizationId: userOrg.id,
        });

        return ok(organization);
      } catch (error) {
        logger.error("Failed to fetch user organization", {
          userId: user.id,
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
   * Uses Better Auth organization plugin
   */
  private static async createDefaultOrganizationForUser(
    user: BetterAuthUser
  ): Promise<ActionResult<BetterAuthOrganizationDto>> {
    try {
      // Generate organization slug and name from user email
      const emailLocal = (user.email ?? "user").split("@")[0] ?? "user";
      const timestamp = Date.now().toString().slice(-6);
      const orgSlug = `org-${emailLocal}-${timestamp}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-");
      const orgName = `${user.name ?? user.email ?? "User"}'s Organization`;

      logger.info("Creating default organization for user", {
        userId: user.id,
        orgSlug,
        orgName,
      });

      // Create organization using Better Auth API
      try {
        const createOrgResponse = await auth.api.createOrganization({
          headers: await headers(),
          body: {
            name: orgName,
            slug: orgSlug,
            userId: user.id, // Set creator as the user
          },
        });

        // Better Auth API returns organization data
        // The response structure may vary, so handle both cases
        const response = createOrgResponse as
          | { data?: BetterAuthOrganizationResponse }
          | BetterAuthOrganizationResponse;
        const orgData =
          "data" in response && response.data
            ? response.data
            : (response as BetterAuthOrganizationResponse);
        if (!orgData?.id) {
          logger.error(
            "Failed to create default organization - no ID returned",
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

        const newOrganization: BetterAuthOrganizationDto = {
          id: orgData.id,
          name: orgData.name ?? orgName,
          slug: orgData.slug ?? orgSlug,
        };

        // Better Auth automatically adds the creator as owner when creating an organization
        // So we don't need to explicitly add the member
        logger.info("Successfully created and assigned organization to user", {
          userId: user.id,
          organizationId: newOrganization.id,
        });

        return ok(newOrganization);
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

