"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { policyToPermissions } from "@/lib/permission-helpers";
import { ActionErrors } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { OrganizationService } from "@/server/services/organization.service";
import { z } from "zod";

export interface OrganizationMember {
  id: string;
  email: string | null;
  given_name: string | null;
  family_name: string | null;
  displayName: string;
}

/**
 * Server action to get organization members
 */
export const getOrgMembers = authorizedActionClient
  .metadata({ permissions: policyToPermissions("tasks:read") })
  .schema(z.void())
  .action(async ({ ctx }) => {
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    // Fetch organization members via service layer
    const membersResult = await OrganizationService.getOrganizationMembers(
      organizationId
    );

    if (membersResult.isErr()) {
      logger.error("Failed to fetch organization members", {
        component: "getOrgMembers",
        error: membersResult.error,
      });

      throw ActionErrors.internal(
        "Failed to fetch organization members",
        membersResult.error,
        "get-org-members"
      );
    }

    // Transform to include display name
    const members: OrganizationMember[] = membersResult.value.map((member) => ({
      id: member.id,
      email: member.email,
      given_name: member.given_name,
      family_name: member.family_name,
      displayName:
        member.given_name && member.family_name
          ? `${member.given_name} ${member.family_name}`.trim()
          : member.email ?? member.id,
    }));

    return members;
  });

