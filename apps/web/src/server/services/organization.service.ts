import { Result, err, ok } from "neverthrow";
import { logger } from "../../lib/logger";
import { OrganizationQueries } from "../data-access";
import type {
  CreateOrganizationDto,
  OrganizationDto,
  OrganizationFiltersDto,
  OrganizationWithStatsDto,
  UpdateOrganizationDto,
} from "../dto";
import { CacheService } from "./cache.service";

/**
 * Business logic layer for Organization operations
 * Orchestrates data access and handles caching
 */

export class OrganizationService {
  /**
   * Create a new organization
   */
  static async createOrganization(
    data: CreateOrganizationDto
  ): Promise<Result<OrganizationDto, string>> {
    try {
      const organization = await OrganizationQueries.create(data);

      // Cache the newly created organization
      await CacheService.set(
        CacheService.KEYS.ORG_BY_KINDE(data.kindeId),
        organization,
        { ttl: CacheService.TTL.ORGANIZATION }
      );

      await CacheService.set(
        CacheService.KEYS.ORG_BY_ID(organization.id),
        organization,
        { ttl: CacheService.TTL.ORGANIZATION }
      );

      return ok(organization);
    } catch (error) {
      const errorMessage = "Failed to create organization";
      logger.error(errorMessage, { data }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Find an organization by Kinde ID with caching
   */
  static async getOrganizationByKindeId(
    kindeId: string
  ): Promise<Result<OrganizationDto | null, string>> {
    try {
      const cacheKey = CacheService.KEYS.ORG_BY_KINDE(kindeId);

      const organization = await CacheService.withCache(
        cacheKey,
        async () => {
          return await OrganizationQueries.findByKindeId(kindeId);
        },
        { ttl: CacheService.TTL.ORGANIZATION }
      );

      return ok(organization);
    } catch (error) {
      const errorMessage = "Failed to get organization by Kinde ID";
      logger.error(errorMessage, { kindeId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Find an organization by ID with caching
   */
  static async getOrganizationById(
    organizationId: string
  ): Promise<Result<OrganizationDto | null, string>> {
    try {
      const cacheKey = CacheService.KEYS.ORG_BY_ID(organizationId);

      const organization = await CacheService.withCache(
        cacheKey,
        async () => {
          return await OrganizationQueries.findById(organizationId);
        },
        { ttl: CacheService.TTL.ORGANIZATION }
      );

      return ok(organization);
    } catch (error) {
      const errorMessage = "Failed to get organization by ID";
      logger.error(errorMessage, { organizationId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Find an organization by slug (no caching for slug lookups)
   */
  static async getOrganizationBySlug(
    slug: string
  ): Promise<Result<OrganizationDto | null, string>> {
    try {
      const organization = await OrganizationQueries.findBySlug(slug);
      return ok(organization);
    } catch (error) {
      const errorMessage = "Failed to get organization by slug";
      logger.error(errorMessage, { slug }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Find an organization with statistics (no caching for complex stats)
   */
  static async getOrganizationByIdWithStats(
    organizationId: string
  ): Promise<Result<OrganizationWithStatsDto | null, string>> {
    try {
      const organization = await OrganizationQueries.findByIdWithStats(
        organizationId
      );
      return ok(organization);
    } catch (error) {
      const errorMessage = "Failed to get organization with stats";
      logger.error(errorMessage, { organizationId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Find all organizations with optional filters
   */
  static async getAllOrganizations(
    filters?: OrganizationFiltersDto
  ): Promise<Result<OrganizationDto[], string>> {
    try {
      const organizations = await OrganizationQueries.findAll(filters);
      return ok(organizations);
    } catch (error) {
      const errorMessage = "Failed to get all organizations";
      logger.error(errorMessage, { filters }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Update an organization
   */
  static async updateOrganization(
    organizationId: string,
    data: UpdateOrganizationDto
  ): Promise<Result<OrganizationDto | null, string>> {
    try {
      const organization = await OrganizationQueries.update(
        organizationId,
        data
      );

      if (organization) {
        // Invalidate cache after update
        await CacheService.INVALIDATION.invalidateOrganization(
          organizationId,
          organization.kindeId
        );
      }

      return ok(organization);
    } catch (error) {
      const errorMessage = "Failed to update organization";
      logger.error(errorMessage, { organizationId, data }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Delete an organization
   */
  static async deleteOrganization(
    organizationId: string
  ): Promise<Result<boolean, string>> {
    try {
      // Get organization first to invalidate cache
      const orgResult = await this.getOrganizationById(organizationId);

      const success = await OrganizationQueries.delete(organizationId);

      if (success && orgResult.isOk() && orgResult.value) {
        // Invalidate cache after deletion
        await CacheService.INVALIDATION.invalidateOrganization(
          organizationId,
          orgResult.value.kindeId
        );
      }

      return ok(success);
    } catch (error) {
      const errorMessage = "Failed to delete organization";
      logger.error(errorMessage, { organizationId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Check if organization exists by Kinde ID
   */
  static async existsByKindeId(
    kindeId: string
  ): Promise<Result<boolean, string>> {
    try {
      const exists = await OrganizationQueries.existsByKindeId(kindeId);
      return ok(exists);
    } catch (error) {
      const errorMessage = "Failed to check organization existence by Kinde ID";
      logger.error(errorMessage, { kindeId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Check if organization exists by slug
   */
  static async existsBySlug(slug: string): Promise<Result<boolean, string>> {
    try {
      const exists = await OrganizationQueries.existsBySlug(slug);
      return ok(exists);
    } catch (error) {
      const errorMessage = "Failed to check organization existence by slug";
      logger.error(errorMessage, { slug }, error as Error);
      return err(errorMessage);
    }
  }
}

