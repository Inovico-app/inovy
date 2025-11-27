import { eq } from "drizzle-orm";
import { db } from "../db";
import { member, organization, user } from "../db/schema/auth";

/**
 * Database queries for Organization operations
 * Pure data access layer - no business logic
 */
export class OrganizationQueries {
  /**
   * Get organization by ID
   */
  static async findById(organizationId: string): Promise<{
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    return org ?? null;
  }

  /**
   * Get organization members
   */
  static async getMembers(organizationId: string): Promise<
    Array<{
      id: string;
      email: string;
      name: string | null;
      role: string;
    }>
  > {
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

    return members;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use OrganizationQueries.getMembers instead
 */
export async function getOrganizationMembers(organizationId: string): Promise<
  Array<{
    id: string;
    email: string | null;
    given_name: string | null;
    family_name: string | null;
    roles?: string[];
  }>
> {
  const members = await OrganizationQueries.getMembers(organizationId);

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
}

