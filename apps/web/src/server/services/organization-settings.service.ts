import { ActionErrors, type ActionResult } from "@/lib/action-errors";
import type { AuthUser } from "@/lib/auth";
import { CacheInvalidation } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { err, ok } from "neverthrow";
import { OrganizationSettingsQueries } from "../data-access/organization-settings.queries";
import type { OrganizationSettingsDto } from "../dto";

/**
 * Business logic layer for OrganizationSettings operations
 * Orchestrates data access and handles business rules
 */
export class OrganizationSettingsService {
  /**
   * Get organization settings by organization code
   */
  static async getOrganizationSettings(
    orgCode: string
  ): Promise<ActionResult<OrganizationSettingsDto | null>> {
    try {
      const settings = await OrganizationSettingsQueries.findByOrganizationId(
        orgCode
      );

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
        { orgCode },
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
   */
  static async updateOrganizationSettings(
    orgCode: string,
    instructions: string,
    userId: string
  ): Promise<ActionResult<OrganizationSettingsDto>> {
    try {
      // Use createOrUpdate to handle both cases
      const settings = await OrganizationSettingsQueries.createOrUpdate({
        organizationId: orgCode,
        instructions,
        createdById: userId,
      });

      // Invalidate cache
      CacheInvalidation.invalidateOrganizationSettings(orgCode);

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
        { orgCode, userId },
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
   */
  static async createInstructions(
    instructions: string,
    orgCode: string,
    user: AuthUser
  ): Promise<ActionResult<OrganizationSettingsDto>> {
    return this.updateOrganizationSettings(orgCode, instructions, user.id);
  }

  /**
   * Update organization instructions
   * Alias for updateOrganizationSettings to match ORG-INST-002 API
   */
  static async updateInstructions(
    instructions: string,
    orgCode: string
  ): Promise<ActionResult<OrganizationSettingsDto>> {
    // Note: We need a userId but the caller doesn't provide one.
    // For updates, we'll use the existing createdById from the DB
    try {
      const existing = await OrganizationSettingsQueries.findByOrganizationId(
        orgCode
      );

      if (!existing) {
        return err(
          ActionErrors.notFound(
            "Organization settings",
            "OrganizationSettingsService.updateInstructions"
          )
        );
      }

      return this.updateOrganizationSettings(
        orgCode,
        instructions,
        existing.createdById
      );
    } catch (error) {
      logger.error(
        "Failed to update instructions",
        { orgCode },
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

