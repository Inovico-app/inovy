"use server";

import { logger } from "@/lib/logger";
import { getAuthSession } from "@/lib/auth";
import { getOrganizationMembers } from "@/server/data-access/organization.queries";

export interface OrganizationMember {
  id: string;
  email: string | null;
  given_name: string | null;
  family_name: string | null;
  displayName: string;
}

export async function getOrgMembers(): Promise<{
  success: boolean;
  data?: OrganizationMember[];
  error?: string;
}> {
  try {
    // Get authenticated user session
    const authResult = await getAuthSession();
    if (authResult.isErr()) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    const { organization } = authResult.value;

    if (!organization) {
      return {
        success: false,
        error: "Organization not found",
      };
    }

    // Fetch organization members
    const membersResult = await getOrganizationMembers(organization.orgCode);

    if (membersResult.isErr()) {
      logger.error("Failed to fetch organization members", {
        component: "getOrgMembers",
        error: membersResult.error,
      });

      return {
        success: false,
        error: "Failed to fetch organization members",
      };
    }

    // Transform to include display name
    const members = membersResult.value.map((member) => ({
      id: member.id,
      email: member.email,
      given_name: member.given_name,
      family_name: member.family_name,
      displayName:
        member.given_name && member.family_name
          ? `${member.given_name} ${member.family_name}`.trim()
          : member.email ?? member.id,
    }));

    return {
      success: true,
      data: members,
    };
  } catch (error) {
    logger.error("Unexpected error fetching organization members", {
      component: "getOrgMembers",
      error,
    });

    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

