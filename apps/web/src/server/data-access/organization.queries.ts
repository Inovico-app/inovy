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

  /**
   * Get all organizations with member counts
   * Direct DB query - for use in cached contexts without headers
   * For superadmin use only
   */
  static async findAllWithMemberCounts(): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      logo: string | null;
      createdAt: Date;
      memberCount: number;
    }>
  > {
    const orgsResult = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        createdAt: organizations.createdAt,
      })
      .from(organizations);

    // Get member counts for each organization
    const orgsWithCounts = await Promise.all(
      orgsResult.map(async (org) => {
        const memberCountResult = await db
          .select()
          .from(members)
          .where(eq(members.organizationId, org.id));

        return {
          ...org,
          memberCount: memberCountResult.length,
        };
      })
    );

    return orgsWithCounts;
  }

  /**
   * Get organization by ID - direct DB query
   * For use in cached contexts without headers
   * For superadmin use only
   */
  static async findByIdDirect(organizationId: string): Promise<{
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: Date;
    metadata: string | null;
  } | null> {
    const [dbOrg] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        createdAt: organizations.createdAt,
        metadata: organizations.metadata,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!dbOrg) {
      return null;
    }

    return dbOrg;
  }

  /**
   * Get organization members - direct DB query
   * For use in cached contexts without headers
   */
  static async getMembersDirect(organizationId: string): Promise<
    Array<{
      id: string;
      email: string;
      name: string | null;
      role: string;
    }>
  > {
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

  /**
   * Create an organization with a member in a transaction
   * Ensures atomicity - if either operation fails, both are rolled back
   * @param data - Organization and member creation data
   * @returns The created organization ID
   */
  static async createOrganizationWithMember(data: {
    organizationId: string;
    name: string;
    slug: string;
    userId: string;
    memberId: string;
    memberRole?:
      | "owner"
      | "admin"
      | "superadmin"
      | "manager"
      | "user"
      | "viewer";
  }): Promise<string> {
    return await db.transaction(async (tx) => {
      const now = new Date();

      // Create organization
      await tx.insert(organizations).values({
        id: data.organizationId,
        name: data.name,
        slug: data.slug,
        createdAt: now,
        agentEnabled: true, // Default to enabled
      });

      await tx.insert(members).values({
        id: data.memberId,
        organizationId: data.organizationId,
        userId: data.userId,
        role: data.memberRole ?? "owner",
        createdAt: now,
      });

      return data.organizationId;
    });
  }

  /**
   * Get agent configuration for an organization
   * @param organizationId - Organization ID
   * @returns Agent enabled status or null if organization not found
   */
  static async getAgentConfig(organizationId: string): Promise<boolean | null> {
    const [org] = await db
      .select({ agentEnabled: organizations.agentEnabled })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    return org?.agentEnabled ?? null;
  }

  /**
   * Update agent configuration for an organization
   * @param organizationId - Organization ID
   * @param enabled - Whether agent is enabled
   * @returns true if update successful, false if organization not found
   */
  static async updateAgentConfig(
    organizationId: string,
    enabled: boolean
  ): Promise<boolean> {
    const [updated] = await db
      .update(organizations)
      .set({ agentEnabled: enabled })
      .where(eq(organizations.id, organizationId))
      .returning();

    return !!updated;
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

