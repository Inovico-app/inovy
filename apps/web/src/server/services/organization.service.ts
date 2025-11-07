import { err, ok } from "neverthrow";
import { ActionErrors, type ActionResult } from "../../lib/action-errors";
import { logger } from "../../lib/logger";
import { getOrganizationMembers } from "../data-access/organization.queries";

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
 */
export class OrganizationService {
  /**
   * Get all members of an organization
   */
  static async getOrganizationMembers(
    orgCode: string
  ): Promise<ActionResult<OrganizationMemberDto[]>> {
    logger.info("Fetching organization members", {
      component: "OrganizationService.getOrganizationMembers",
      orgCode,
    });

    try {
      const members = await getOrganizationMembers(orgCode);

      logger.info("Successfully fetched organization members", {
        component: "OrganizationService.getOrganizationMembers",
        orgCode,
        count: members.length,
      });

      return ok(members);
    } catch (error) {
      logger.error("Failed to get organization members from database", {
        component: "OrganizationService.getOrganizationMembers",
        error,
        orgCode,
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

