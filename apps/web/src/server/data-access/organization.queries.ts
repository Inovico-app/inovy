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
    // Handle "not_found" response from Kinde API gracefully
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("not_found") || errorMessage === "not_found") {
      // Organization not found or no members - return empty array
      logger.info("Organization not found or has no members", { orgCode });
      return [];
    }

    // Log other errors properly
    const errorObj =
      error instanceof Error
        ? error
        : new Error(
            typeof error === "string" ? error : "Unknown error occurred"
          );

    logger.error("Failed to get organization members", { orgCode }, errorObj);

    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
}

