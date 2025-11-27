import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import { member, user } from "@/server/db/schema/auth";
import { eq } from "drizzle-orm";

export async function getOrganizationMembers(organizationId: string): Promise<
  Array<{
    id: string;
    email: string | null;
    given_name: string | null;
    family_name: string | null;
    roles?: string[];
  }>
> {
  try {
    // Query organization members directly from Better Auth tables
    const members = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: member.role,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, organizationId));

    if (members.length === 0) {
      return [];
    }

    // Map Better Auth member format to our expected format
    return members.map((member) => {
      const roles = member.role ? [member.role] : [];
      const nameParts = member.name?.split(" ") ?? [];
      const given_name = nameParts[0] ?? null;
      const family_name = nameParts.slice(1).join(" ") || null;

      return {
        id: member.id,
        email: member.email ?? null,
        given_name,
        family_name,
        roles,
      };
    });
  } catch (error) {
    // Handle organization not found or no members gracefully
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("not_found") ||
      errorMessage === "not_found" ||
      errorMessage.includes("Organization not found")
    ) {
      // Organization not found or no members - return empty array
      logger.info("Organization not found or has no members", {
        organizationId,
      });
      return [];
    }

    // Log other errors properly
    const errorObj =
      error instanceof Error
        ? error
        : new Error(
            typeof error === "string" ? error : "Unknown error occurred"
          );

    logger.error(
      "Failed to get organization members",
      { organizationId },
      errorObj
    );

    // Re-throw non-recoverable errors so callers can handle them appropriately
    throw errorObj;
  }
}

