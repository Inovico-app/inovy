import { and, eq } from "drizzle-orm";
import { CacheService } from "../cache";
import { db } from "../db";
import { organizationsTable, users } from "../db/schema";
import type {
  CreateUserDto,
  UpdateUserDto,
  UserDto,
  UserFiltersDto,
  UserWithOrganizationDto,
} from "../dto/user.dto";

/**
 * Database queries for User operations
 * Pure data access layer - no business logic
 */

export class UserQueries {
  /**
   * Create a new user in the database
   */
  static async create(data: CreateUserDto): Promise<UserDto> {
    return await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          kindeId: data.kindeId,
          email: data.email,
          givenName: data.givenName || null,
          familyName: data.familyName || null,
          picture: data.picture || null,
          organizationId: data.organizationId,
        })
        .returning();

      const result = {
        id: user.id,
        kindeId: user.kindeId,
        email: user.email,
        givenName: user.givenName,
        familyName: user.familyName,
        picture: user.picture,
        organizationId: user.organizationId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      // Cache the newly created user
      await CacheService.set(
        CacheService.KEYS.USER_BY_KINDE(data.kindeId),
        result,
        { ttl: CacheService.TTL.USER }
      );

      await CacheService.set(CacheService.KEYS.USER_BY_ID(result.id), result, {
        ttl: CacheService.TTL.USER,
      });

      return result;
    });
  }

  /**
   * Find a user by Kinde ID
   */
  static async findByKindeId(kindeId: string): Promise<UserDto | null> {
    const cacheKey = CacheService.KEYS.USER_BY_KINDE(kindeId);

    return CacheService.withCache(
      cacheKey,
      async () => {
        const result = await db
          .select({
            id: users.id,
            kindeId: users.kindeId,
            email: users.email,
            givenName: users.givenName,
            familyName: users.familyName,
            picture: users.picture,
            organizationId: users.organizationId,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(eq(users.kindeId, kindeId))
          .limit(1);

        if (result.length === 0) return null;

        return result[0];
      },
      { ttl: CacheService.TTL.USER }
    );
  }

  /**
   * Find a user by ID
   */
  static async findById(userId: string): Promise<UserDto | null> {
    const cacheKey = CacheService.KEYS.USER_BY_ID(userId);

    return CacheService.withCache(
      cacheKey,
      async () => {
        const result = await db
          .select({
            id: users.id,
            kindeId: users.kindeId,
            email: users.email,
            givenName: users.givenName,
            familyName: users.familyName,
            picture: users.picture,
            organizationId: users.organizationId,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (result.length === 0) return null;

        return result[0];
      },
      { ttl: CacheService.TTL.USER }
    );
  }

  /**
   * Find a user by Kinde ID with organization information
   */
  static async findByKindeIdWithOrganization(
    kindeId: string
  ): Promise<UserWithOrganizationDto | null> {
    const result = await db
      .select({
        id: users.id,
        kindeId: users.kindeId,
        email: users.email,
        givenName: users.givenName,
        familyName: users.familyName,
        picture: users.picture,
        organizationId: users.organizationId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        organization: {
          id: organizationsTable.id,
          name: organizationsTable.name,
          slug: organizationsTable.slug,
        },
      })
      .from(users)
      .leftJoin(
        organizationsTable,
        eq(users.organizationId, organizationsTable.id)
      )
      .where(eq(users.kindeId, kindeId))
      .limit(1);

    if (result.length === 0) return null;

    const user = result[0];
    return {
      id: user.id,
      kindeId: user.kindeId,
      email: user.email,
      givenName: user.givenName,
      familyName: user.familyName,
      picture: user.picture,
      organizationId: user.organizationId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      organization: user.organization || {
        id: "",
        name: "Unknown",
        slug: "unknown",
      },
    };
  }

  /**
   * Find users by organization
   */
  static async findByOrganization(
    organizationId: string,
    filters?: Omit<UserFiltersDto, "organizationId">
  ): Promise<UserDto[]> {
    const whereConditions = [eq(users.organizationId, organizationId)];

    if (filters?.email) {
      whereConditions.push(eq(users.email, filters.email));
    }

    return await db
      .select({
        id: users.id,
        kindeId: users.kindeId,
        email: users.email,
        givenName: users.givenName,
        familyName: users.familyName,
        picture: users.picture,
        organizationId: users.organizationId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(...whereConditions))
      .limit(filters?.limit || 100)
      .offset(filters?.offset || 0);
  }

  /**
   * Update a user
   */
  static async update(
    userId: string,
    data: UpdateUserDto
  ): Promise<UserDto | null> {
    return await db.transaction(async (tx) => {
      const result = await tx
        .update(users)
        .set({
          ...(data.email && { email: data.email }),
          ...(data.givenName !== undefined && { givenName: data.givenName }),
          ...(data.familyName !== undefined && { familyName: data.familyName }),
          ...(data.picture !== undefined && { picture: data.picture }),
          ...(data.organizationId && { organizationId: data.organizationId }),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      if (result.length === 0) return null;

      const user = result[0];
      const updatedUser = {
        id: user.id,
        kindeId: user.kindeId,
        email: user.email,
        givenName: user.givenName,
        familyName: user.familyName,
        picture: user.picture,
        organizationId: user.organizationId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      // Invalidate cache after update
      await CacheService.INVALIDATION.invalidateUser(
        userId,
        user.kindeId,
        user.organizationId
      );

      return updatedUser;
    });
  }

  /**
   * Delete a user (hard delete)
   */
  static async delete(userId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const result = await tx
        .delete(users)
        .where(eq(users.id, userId))
        .returning();

      return result.length > 0;
    });
  }

  /**
   * Count users by organization
   */
  static async countByOrganization(organizationId: string): Promise<number> {
    const result = await db
      .select({ count: users.id })
      .from(users)
      .where(eq(users.organizationId, organizationId));

    return result.length;
  }
}

