import { AuthService } from "@/lib/kinde-api";
import { logger } from "@/lib/logger";

export async function getOrganizationMembers(orgCode: string): Promise<
  Array<{
    id: string;
    email: string | null;
    given_name: string | null;
    family_name: string | null;
    roles?: string[];
  }>
> {
  try {
    const Organizations = await AuthService.getOrganizations();
    const response = await Organizations.getOrganizationUsers({
      orgCode,
    });

    if (!response?.organization_users) {
      return [];
    }

    return response.organization_users.map((user) => ({
      id: user.id || "",
      email: user.email || null,
      given_name: user.first_name || null,
      family_name: user.last_name || null,
      roles: user.roles || [],
    }));
  } catch (error) {
    logger.error(
      "Failed to get organization members",
      { orgCode },
      error as Error
    );
    throw new Error("Failed to fetch organization members");
  }
}

