import { err, ok } from "neverthrow";
import { logger } from "../../lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import { OrganizationQueries } from "../data-access/organization.queries";

export interface OrganizationMemberDto {
  id: string;
  email: string | null;
  given_name: string | null;
  family_name: string | null;
  roles?: string[];
}

/**
 * Organization Service
 * Handles business logic for organization-related operations
 * Uses Better Auth organization plugin for member management
 */
export class OrganizationService {
  /**
   * Get all members of an organization
   * @param organizationId - Better Auth organization ID (UUID)
   */
  static async getOrganizationMembers(
    organizationId: string
  ): Promise<ActionResult<OrganizationMemberDto[]>> {
    logger.info("Fetching organization members", {
      component: "OrganizationService.getOrganizationMembers",
      organizationId,
    });

    try {
      const membersData = await OrganizationQueries.getMembers(organizationId);

      const members: OrganizationMemberDto[] = membersData.map((member) => {
        const roles = member.role ? [member.role] : [];
        const nameParts = member.name?.split(" ") ?? [];
        return {
          id: member.id,
          email: member.email ?? null,
          given_name: nameParts[0] ?? null,
          family_name: nameParts.slice(1).join(" ") || null,
          roles,
        };
      });

      logger.info("Successfully fetched organization members", {
        component: "OrganizationService.getOrganizationMembers",
        organizationId,
        count: members.length,
      });

      return ok(members);
    } catch (error) {
      logger.error("Failed to get organization members", {
        component: "OrganizationService.getOrganizationMembers",
        error,
        organizationId,
      });

      return err(
        ActionErrors.internal(
          "Failed to get organization members",
          error as Error,
          "OrganizationService.getOrganizationMembers"
        )
      );
    }
  }

  /**
   * Get the first organization for a user
   * Used to automatically set active organization when session is created
   * @param userId - User ID to get organization for
   * @returns ActionResult with organization ID or null if user has no organizations
   */
  static async getFirstOrganizationForUser(
    userId: string
  ): Promise<ActionResult<string | null>> {
    logger.info("Getting first organization for user", {
      component: "OrganizationService.getFirstOrganizationForUser",
      userId,
    });

    try {
      const organizationId =
        await OrganizationQueries.getFirstOrganizationForUser(userId);

      logger.info("Successfully retrieved first organization for user", {
        component: "OrganizationService.getFirstOrganizationForUser",
        userId,
        organizationId,
      });

      return ok(organizationId);
    } catch (error) {
      logger.error("Failed to get first organization for user", {
        component: "OrganizationService.getFirstOrganizationForUser",
        error,
        userId,
      });

      return err(
        ActionErrors.internal(
          "Failed to get first organization for user",
          error as Error,
          "OrganizationService.getFirstOrganizationForUser"
        )
      );
    }
  }
}

