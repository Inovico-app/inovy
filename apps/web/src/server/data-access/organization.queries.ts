import { type Result, err, ok } from "neverthrow";
import { logger } from "../../lib/logger";
import { KindeOrganizationService, KindeUserService } from "../services";

/**
 * Get organization members
 */
export async function getOrganizationMembers(
  orgCode: string
): Promise<Result<Array<{ id: string; email: string | null; given_name: string | null; family_name: string | null; roles?: string[] }>, string>> {
  try {
    const result = await KindeUserService.getUsersByOrganization(orgCode);

    if (result.isErr()) {
      logger.error("Failed to fetch organization members", { orgCode, error: result.error });
      return err(result.error);
    }

    // Map Kinde response to our DTO format
    const members = result.value.map((user) => ({
      id: user.id,
      email: user.email || null,
      given_name: user.given_name || null,
      family_name: user.family_name || null,
      roles: user.roles || [],
    }));

    logger.info("Successfully fetched organization members", {
      orgCode,
      count: members.length,
    });

    return ok(members);
  } catch (error) {
    const errorMessage = "Failed to fetch organization members";
    logger.error(errorMessage, { orgCode }, error as Error);
    return err(errorMessage);
  }
}
