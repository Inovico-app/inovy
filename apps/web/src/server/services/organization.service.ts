import { err, ok } from "neverthrow";
import { ActionErrors, type ActionResult } from "../../lib/action-errors";
import { logger } from "../../lib/logger";
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
}

