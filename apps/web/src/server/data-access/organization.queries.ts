import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "../db";
import { members, organizations, users } from "../db/schema/auth";

// Infer Better Auth types
type BetterAuthOrganization = typeof auth.$Infer.Organization;
type BetterAuthMember = typeof auth.$Infer.Member;

/**
 * Database queries for Organization operations
 * Uses Better Auth APIs for CRUD operations
 * Pure data access layer - no business logic
 */
export class OrganizationQueries {
  /**
   * Get organization by ID using Better Auth API
   */
  static async findById(
    organizationId: string,
    requestHeaders?: Headers
  ): Promise<{
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const headersList = requestHeaders ?? (await headers());

    // Better Auth listOrganizations returns all organizations for the user
    const orgsList = await auth.api.listOrganizations({
      headers: headersList,
      query: {
        organizationId,
      },
    });

    // Find the organization with matching ID
    const orgList = Array.isArray(orgsList) ? orgsList : [];
    const org = orgList.find(
      (o: BetterAuthOrganization) => o.id === organizationId
    ) as BetterAuthOrganization | undefined;

    // If not found via Better Auth, fall back to direct DB query
    if (!org) {
      const [dbOrg] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!dbOrg) {
        return null;
      }

      return {
        id: dbOrg.id,
        name: dbOrg.name,
        slug: dbOrg.slug,
        logo: dbOrg.logo ?? null,
        createdAt: dbOrg.createdAt,
        updatedAt: dbOrg.createdAt, // Schema doesn't have updatedAt, use createdAt
      };
    }

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo ?? null,
      createdAt: org.createdAt ?? new Date(),
      updatedAt: org.createdAt ?? new Date(), // Better Auth doesn't have updatedAt, use createdAt
    };
  }

  /**
   * Get organization members using Better Auth API
   */
  static async getMembers(
    organizationId: string,
    requestHeaders?: Headers
  ): Promise<
    Array<{
      id: string;
      email: string;
      name: string | null;
      role: string;
    }>
  > {
    const headersList = requestHeaders ?? (await headers());

    try {
      // Better Auth provides listMembers API
      const members = await auth.api.listMembers({
        headers: headersList,
        query: {
          organizationId,
        },
      });

      // Better Auth returns an array of members
      const membersList = Array.isArray(members) ? members : [];

      return membersList.map((member: BetterAuthMember) => ({
        id: member.userId,
        email: (member as { user?: { email: string } }).user?.email ?? "",
        name: (member as { user?: { name: string | null } }).user?.name ?? null,
        role: member.role ?? "",
      }));
    } catch {
      // Fall back to direct DB query if Better Auth API fails
      const dbMembers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: members.role,
        })
        .from(members)
        .innerJoin(users, eq(members.userId, users.id))
        .where(eq(members.organizationId, organizationId));

      return dbMembers.map((member) => ({
        id: member.id,
        email: member.email,
        name: member.name,
        role: member.role,
      }));
    }
  }

  /**
   * Check if an organization name already exists
   * @param name - Organization name to check
   * @returns true if organization with this name exists, false otherwise
   */
  static async nameExists(name: string): Promise<boolean> {
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.name, name))
      .limit(1);

    return !!existingOrg;
  }

  /**
   * Check if an organization slug already exists using Better Auth API
   * @param slug - Organization slug to check
   * @param requestHeaders - Optional headers for Better Auth API
   * @returns true if organization with this slug exists, false otherwise
   */
  static async slugExists(
    slug: string,
    requestHeaders?: Headers
  ): Promise<boolean> {
    try {
      const headersList = requestHeaders ?? (await headers());
      const result = await auth.api.checkOrganizationSlug({
        headers: headersList,
        body: {
          slug,
        },
      });

      // Better Auth checkSlug returns { available: boolean }
      return result.status;
    } catch {
      // Fall back to direct DB query if Better Auth API fails
      const [existingOrg] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug))
        .limit(1);

      return !!existingOrg;
    }
  }

  /**
   * Get the first organization for a user
   * Used to automatically set active organization when session is created
   * @param userId - User ID to get organization for
   * @returns Organization ID or null if user has no organizations
   */
  static async getFirstOrganizationForUser(
    userId: string
  ): Promise<string | null> {
    const [member] = await db
      .select({ organizationId: members.organizationId })
      .from(members)
      .where(eq(members.userId, userId))
      .limit(1);

    return member?.organizationId ?? null;
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

