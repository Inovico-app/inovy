import { count, eq, getTableColumns } from "drizzle-orm";
import { db } from "../db";
import { organizationsTable, projects, users } from "../db/schema";
import type {
  CreateOrganizationDto,
  OrganizationDto,
  OrganizationFiltersDto,
  OrganizationWithStatsDto,
  UpdateOrganizationDto,
} from "../dto/organization.dto";

/**
 * Database queries for Organization operations
 * Pure data access layer - no business logic
 */

export class OrganizationQueries {
  /**
   * Create a new organization in the database
   */
  static async create(data: CreateOrganizationDto): Promise<OrganizationDto> {
    return await db.transaction(async (tx) => {
      const [organization] = await tx
        .insert(organizationsTable)
        .values({
          kindeId: data.kindeId,
          name: data.name,
          slug: data.slug,
        })
        .returning();

      return {
        id: organization.id,
        kindeId: organization.kindeId,
        name: organization.name,
        slug: organization.slug,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      };
    });
  }

  /**
   * Find an organization by Kinde ID
   */
  static async findByKindeId(kindeId: string): Promise<OrganizationDto | null> {
    const result = await db
      .select({
        ...getTableColumns(organizationsTable),
      })
      .from(organizationsTable)
      .where(eq(organizationsTable.kindeId, kindeId))
      .limit(1);

    if (result.length === 0) return null;

    return result[0];
  }

  /**
   * Find an organization by ID
   */
  static async findById(
    organizationId: string
  ): Promise<OrganizationDto | null> {
    const result = await db
      .select({
        ...getTableColumns(organizationsTable),
      })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, organizationId))
      .limit(1);

    if (result.length === 0) return null;

    return result[0];
  }

  /**
   * Find an organization by slug
   */
  static async findBySlug(slug: string): Promise<OrganizationDto | null> {
    const result = await db
      .select({
        ...getTableColumns(organizationsTable),
      })
      .from(organizationsTable)
      .where(eq(organizationsTable.slug, slug))
      .limit(1);

    if (result.length === 0) return null;

    return result[0];
  }

  /**
   * Find an organization with statistics
   */
  static async findByIdWithStats(
    organizationId: string
  ): Promise<OrganizationWithStatsDto | null> {
    return await db.transaction(async (tx) => {
      // Get basic organization data
      const result = await tx
        .select({
          ...getTableColumns(organizationsTable),
          memberCount: count(users.id),
          projectCount: count(projects.id),
        })
        .from(organizationsTable)
        .leftJoin(users, eq(organizationsTable.id, users.organizationId))
        .leftJoin(projects, eq(organizationsTable.id, projects.organizationId))
        .where(eq(organizationsTable.id, organizationId));

      if (result.length === 0) return null;

      return result[0];
    });
  }

  /**
   * Find all organizations with optional filters
   */
  static async findAll(
    filters?: OrganizationFiltersDto
  ): Promise<OrganizationDto[]> {
    // For now, return all organizations without filters to avoid complex query chaining issues
    const result = await db
      .select({
        ...getTableColumns(organizationsTable),
      })
      .from(organizationsTable);

    return result;
  }

  /**
   * Update an organization
   */
  static async update(
    organizationId: string,
    data: UpdateOrganizationDto
  ): Promise<OrganizationDto | null> {
    return await db.transaction(async (tx) => {
      const result = await tx
        .update(organizationsTable)
        .set({
          ...(data.name && { name: data.name }),
          ...(data.slug && { slug: data.slug }),
          updatedAt: new Date(),
        })
        .where(eq(organizationsTable.id, organizationId))
        .returning();

      if (result.length === 0) return null;

      const organization = result[0];
      return {
        id: organization.id,
        kindeId: organization.kindeId,
        name: organization.name,
        slug: organization.slug,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      };
    });
  }

  /**
   * Delete an organization (hard delete)
   * Note: This should be used with extreme caution as it will orphan related data
   */
  static async delete(organizationId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const result = await tx
        .delete(organizationsTable)
        .where(eq(organizationsTable.id, organizationId))
        .returning();

      return result.length > 0;
    });
  }

  /**
   * Check if organization exists by Kinde ID
   */
  static async existsByKindeId(kindeId: string): Promise<boolean> {
    const result = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.kindeId, kindeId))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Check if organization exists by slug
   */
  static async existsBySlug(slug: string): Promise<boolean> {
    const result = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.slug, slug))
      .limit(1);

    return result.length > 0;
  }
}

