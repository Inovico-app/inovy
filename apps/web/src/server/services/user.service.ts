import { Result, err, ok } from "neverthrow";
import { logger } from "../../lib/logger";
import { UserQueries } from "../data-access";
import type {
  CreateUserDto,
  UpdateUserDto,
  UserDto,
  UserFiltersDto,
  UserWithOrganizationDto,
} from "../dto";
import { CacheService } from "./cache.service";

/**
 * Business logic layer for User operations
 * Orchestrates data access and handles caching
 */

export class UserService {
  /**
   * Create a new user
   */
  static async createUser(
    data: CreateUserDto
  ): Promise<Result<UserDto, string>> {
    try {
      const user = await UserQueries.create(data);

      // Cache the newly created user
      await CacheService.set(
        CacheService.KEYS.USER_BY_KINDE(data.kindeId),
        user,
        { ttl: CacheService.TTL.USER }
      );

      await CacheService.set(CacheService.KEYS.USER_BY_ID(user.id), user, {
        ttl: CacheService.TTL.USER,
      });

      return ok(user);
    } catch (error) {
      const errorMessage = "Failed to create user";
      logger.error(errorMessage, { data }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Find a user by Kinde ID with caching
   */
  static async getUserByKindeId(
    kindeId: string
  ): Promise<Result<UserDto | null, string>> {
    try {
      const cacheKey = CacheService.KEYS.USER_BY_KINDE(kindeId);

      const user = await CacheService.withCache(
        cacheKey,
        async () => {
          return await UserQueries.findByKindeId(kindeId);
        },
        { ttl: CacheService.TTL.USER }
      );

      return ok(user);
    } catch (error) {
      const errorMessage = "Failed to get user by Kinde ID";
      logger.error(errorMessage, { kindeId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Find a user by ID with caching
   */
  static async getUserById(
    userId: string
  ): Promise<Result<UserDto | null, string>> {
    try {
      const cacheKey = CacheService.KEYS.USER_BY_ID(userId);

      const user = await CacheService.withCache(
        cacheKey,
        async () => {
          return await UserQueries.findById(userId);
        },
        { ttl: CacheService.TTL.USER }
      );

      return ok(user);
    } catch (error) {
      const errorMessage = "Failed to get user by ID";
      logger.error(errorMessage, { userId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Find a user by Kinde ID with organization information (no caching for complex joins)
   */
  static async getUserByKindeIdWithOrganization(
    kindeId: string
  ): Promise<Result<UserWithOrganizationDto | null, string>> {
    try {
      const user = await UserQueries.findByKindeIdWithOrganization(kindeId);
      return ok(user);
    } catch (error) {
      const errorMessage = "Failed to get user with organization";
      logger.error(errorMessage, { kindeId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Find users by organization
   */
  static async getUsersByOrganization(
    organizationId: string,
    filters?: Omit<UserFiltersDto, "organizationId">
  ): Promise<Result<UserDto[], string>> {
    try {
      const users = await UserQueries.findByOrganization(
        organizationId,
        filters
      );
      return ok(users);
    } catch (error) {
      const errorMessage = "Failed to get users by organization";
      logger.error(errorMessage, { organizationId, filters }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Update a user
   */
  static async updateUser(
    userId: string,
    data: UpdateUserDto
  ): Promise<Result<UserDto | null, string>> {
    try {
      // Get the current user to get kindeId for cache invalidation
      const currentUserResult = await this.getUserById(userId);
      if (currentUserResult.isErr()) {
        return err("Failed to get current user for update");
      }

      const currentUser = currentUserResult.value;
      if (!currentUser) {
        return err("User not found");
      }

      const updatedUser = await UserQueries.update(userId, data);

      if (updatedUser) {
        // Invalidate cache after update
        await CacheService.INVALIDATION.invalidateUser(
          userId,
          currentUser.kindeId,
          updatedUser.organizationId
        );
      }

      return ok(updatedUser);
    } catch (error) {
      const errorMessage = "Failed to update user";
      logger.error(errorMessage, { userId, data }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Delete a user
   */
  static async deleteUser(userId: string): Promise<Result<boolean, string>> {
    try {
      // Get user first to invalidate cache
      const userResult = await this.getUserById(userId);

      const success = await UserQueries.delete(userId);

      if (success && userResult.isOk() && userResult.value) {
        // Invalidate cache after deletion
        await CacheService.INVALIDATION.invalidateUser(
          userId,
          userResult.value.kindeId,
          userResult.value.organizationId
        );
      }

      return ok(success);
    } catch (error) {
      const errorMessage = "Failed to delete user";
      logger.error(errorMessage, { userId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Count users by organization
   */
  static async countUsersByOrganization(
    organizationId: string
  ): Promise<Result<number, string>> {
    try {
      const count = await UserQueries.countByOrganization(organizationId);
      return ok(count);
    } catch (error) {
      const errorMessage = "Failed to count users by organization";
      logger.error(errorMessage, { organizationId }, error as Error);
      return err(errorMessage);
    }
  }
}

