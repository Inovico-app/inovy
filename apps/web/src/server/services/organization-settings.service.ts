import type { BetterAuthUser } from "@/lib/auth";
import { CacheInvalidation } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { err, ok } from "neverthrow";
import { OrganizationSettingsQueries } from "../data-access/organization-settings.queries";
import type { OrganizationSettingsDto } from "../dto/organization-settings.dto";

/**
 * Business logic layer for OrganizationSettings operations
 * Orchestrates data access and handles business rules
 */
export class OrganizationSettingsService {
  /**
   * Get organization settings by organization ID
   * @param organizationId - Better Auth organization ID (UUID)
   */
  static async getOrganizationSettings(
    organizationId: string
  ): Promise<ActionResult<OrganizationSettingsDto | null>> {
    try {
      const settings =
        await OrganizationSettingsQueries.findByOrganizationId(organizationId);

      if (!settings) {
        return ok(null);
      }

      return ok({
        id: settings.id,
        organizationId: settings.organizationId,
        instructions: settings.instructions,
        createdById: settings.createdById,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      });
    } catch (error) {
      logger.error(
        "Failed to get organization settings",
        { organizationId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get organization settings",
          error as Error,
          "OrganizationSettingsService.getOrganizationSettings"
        )
      );
    }
  }

  /**
   * Update organization settings (creates if doesn't exist)
   * @param organizationId - Better Auth organization ID (UUID)
   */
  static async updateOrganizationSettings(
    organizationId: string,
    instructions: string,
    userId: string
  ): Promise<ActionResult<OrganizationSettingsDto>> {
    try {
      // Use createOrUpdate to handle both cases
      const settings = await OrganizationSettingsQueries.createOrUpdate({
        organizationId,
        instructions,
        createdById: userId,
      });

      // Invalidate cache
      CacheInvalidation.invalidateOrganizationSettings(organizationId);

      return ok({
        id: settings.id,
        organizationId: settings.organizationId,
        instructions: settings.instructions,
        createdById: settings.createdById,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      });
    } catch (error) {
      logger.error(
        "Failed to update organization settings",
        { organizationId, userId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to update organization settings",
          error as Error,
          "OrganizationSettingsService.updateOrganizationSettings"
        )
      );
    }
  }

  /**
   * Create organization instructions
   * Alias for updateOrganizationSettings to match ORG-INST-002 API
   * @param organizationId - Better Auth organization ID (UUID)
   */
  static async createInstructions(
    instructions: string,
    organizationId: string,
    user: BetterAuthUser
  ): Promise<ActionResult<OrganizationSettingsDto>> {
    return this.updateOrganizationSettings(
      organizationId,
      instructions,
      user.id
    );
  }

  /**
   * Update organization instructions
   * Alias for updateOrganizationSettings to match ORG-INST-002 API
   * @param organizationId - Better Auth organization ID (UUID)
   */
  static async updateInstructions(
    instructions: string,
    organizationId: string
  ): Promise<ActionResult<OrganizationSettingsDto>> {
    // Note: We need a userId but the caller doesn't provide one.
    // For updates, we'll use the existing createdById from the DB
    try {
      const existing =
        await OrganizationSettingsQueries.findByOrganizationId(organizationId);

      if (!existing) {
        return err(
          ActionErrors.notFound(
            "Organization settings",
            "OrganizationSettingsService.updateInstructions"
          )
        );
      }

      return this.updateOrganizationSettings(
        organizationId,
        instructions,
        existing.createdById
      );
    } catch (error) {
      logger.error(
        "Failed to update instructions",
        { organizationId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to update instructions",
          error as Error,
          "OrganizationSettingsService.updateInstructions"
        )
      );
    }
  }
}

