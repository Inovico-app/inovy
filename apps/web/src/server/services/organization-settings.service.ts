import { err, ok } from "neverthrow";
import { ActionErrors, type ActionResult } from "@/lib/action-errors";
import { CacheInvalidation } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import type { AuthUser } from "@/lib/auth";
import { OrganizationSettingsQueries } from "../data-access/organization-settings.queries";
import type {
  CreateOrganizationInstructionsDto,
  OrganizationInstructionsDto,
  UpdateOrganizationInstructionsDto,
} from "../dto/organization-settings.dto";

/**
 * Organization Settings Service
 * Handles business logic for organization instructions and settings
 */
export class OrganizationSettingsService {
  /**
   * Create organization instructions
   */
  static async createInstructions(
    instructions: string,
    organizationId: string,
    user: AuthUser
  ): Promise<ActionResult<OrganizationInstructionsDto>> {
    logger.info("Creating organization instructions", {
      component: "OrganizationSettingsService.createInstructions",
      organizationId,
      userId: user.id,
    });

    try {
      // Check if instructions already exist
      const exists =
        await OrganizationSettingsQueries.instructionsExist(organizationId);

      if (exists) {
        return err(
          ActionErrors.validation(
            "Organization instructions already exist. Use update instead.",
            { organizationId }
          )
        );
      }

      const data: CreateOrganizationInstructionsDto = {
        instructions,
        organizationId,
        createdById: user.id,
      };

      const result =
        await OrganizationSettingsQueries.createInstructions(data);

      // Invalidate cache
      CacheInvalidation.invalidateOrganizationInstructions(organizationId);

      logger.info("Successfully created organization instructions", {
        component: "OrganizationSettingsService.createInstructions",
        organizationId,
        instructionId: result.id,
      });

      return ok(result);
    } catch (error) {
      logger.error(
        "Failed to create organization instructions",
        {
          component: "OrganizationSettingsService.createInstructions",
          organizationId,
          error,
        }
      );

      return err(
        ActionErrors.internal(
          "Failed to create organization instructions",
          error as Error,
          "OrganizationSettingsService.createInstructions"
        )
      );
    }
  }

  /**
   * Update organization instructions
   */
  static async updateInstructions(
    instructions: string,
    organizationId: string
  ): Promise<ActionResult<OrganizationInstructionsDto>> {
    logger.info("Updating organization instructions", {
      component: "OrganizationSettingsService.updateInstructions",
      organizationId,
    });

    try {
      const data: UpdateOrganizationInstructionsDto = {
        instructions,
      };

      const result = await OrganizationSettingsQueries.updateInstructions(
        organizationId,
        data
      );

      if (!result) {
        return err(
          ActionErrors.notFound(
            "Organization instructions",
            "OrganizationSettingsService.updateInstructions"
          )
        );
      }

      // Invalidate cache
      CacheInvalidation.invalidateOrganizationInstructions(organizationId);

      logger.info("Successfully updated organization instructions", {
        component: "OrganizationSettingsService.updateInstructions",
        organizationId,
        instructionId: result.id,
      });

      return ok(result);
    } catch (error) {
      logger.error(
        "Failed to update organization instructions",
        {
          component: "OrganizationSettingsService.updateInstructions",
          organizationId,
          error,
        }
      );

      return err(
        ActionErrors.internal(
          "Failed to update organization instructions",
          error as Error,
          "OrganizationSettingsService.updateInstructions"
        )
      );
    }
  }

  /**
   * Create default empty instructions for a new organization
   * Called during organization creation
   */
  static async createDefaultInstructions(
    organizationId: string,
    createdById: string
  ): Promise<ActionResult<OrganizationInstructionsDto>> {
    logger.info("Creating default organization instructions", {
      component: "OrganizationSettingsService.createDefaultInstructions",
      organizationId,
    });

    try {
      const result =
        await OrganizationSettingsQueries.createDefaultInstructions(
          organizationId,
          createdById
        );

      logger.info("Successfully created default organization instructions", {
        component: "OrganizationSettingsService.createDefaultInstructions",
        organizationId,
        instructionId: result.id,
      });

      return ok(result);
    } catch (error) {
      logger.error(
        "Failed to create default organization instructions",
        {
          component: "OrganizationSettingsService.createDefaultInstructions",
          organizationId,
          error,
        }
      );

      return err(
        ActionErrors.internal(
          "Failed to create default organization instructions",
          error as Error,
          "OrganizationSettingsService.createDefaultInstructions"
        )
      );
    }
  }
}

