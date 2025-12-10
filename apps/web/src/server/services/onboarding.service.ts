import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { err, ok } from "neverthrow";
import { OnboardingQueries } from "../data-access/onboarding.queries";
import type {
  CreateOnboardingDto,
  OnboardingDto,
  OnboardingStatsDto,
} from "../dto/onboarding.dto";

/**
 * Business logic layer for Onboarding operations
 * Orchestrates data access and handles business rules
 */
export class OnboardingService {
  /**
   * Create a new onboarding record
   */
  static async createOnboarding(
    data: CreateOnboardingDto
  ): Promise<ActionResult<OnboardingDto>> {
    try {
      // Business logic: Validate that either userId or organizationId is provided
      if (!data.userId && !data.organizationId) {
        return err(
          ActionErrors.badRequest(
            "Either userId or organizationId must be provided for onboarding record",
            "OnboardingService.createOnboarding"
          )
        );
      }

      const onboarding = await OnboardingQueries.createOnboarding({
        userId: data.userId,
        organizationId: data.organizationId,
        signupType: data.signupType,
        orgSize: data.orgSize,
        referralSource: data.referralSource,
        signupMethod: data.signupMethod,
      });

      logger.info("Created onboarding record", {
        onboardingId: onboarding.id,
        signupType: onboarding.signupType,
        signupMethod: onboarding.signupMethod,
      });

      return ok({
        id: onboarding.id,
        userId: onboarding.userId,
        organizationId: onboarding.organizationId,
        signupType: onboarding.signupType,
        orgSize: onboarding.orgSize,
        referralSource: onboarding.referralSource,
        signupMethod: onboarding.signupMethod,
        onboardingCompleted: onboarding.onboardingCompleted,
        createdAt: onboarding.createdAt,
        updatedAt: onboarding.updatedAt,
      });
    } catch (error) {
      logger.error("Failed to create onboarding record", { data }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to create onboarding record",
          error as Error,
          "OnboardingService.createOnboarding"
        )
      );
    }
  }

  /**
   * Get onboarding record by user ID
   */
  static async getOnboardingByUserId(
    userId: string
  ): Promise<ActionResult<OnboardingDto | null>> {
    try {
      const onboarding = await OnboardingQueries.getOnboardingByUserId(userId);

      if (!onboarding) {
        return ok(null);
      }

      return ok({
        id: onboarding.id,
        userId: onboarding.userId,
        organizationId: onboarding.organizationId,
        signupType: onboarding.signupType,
        orgSize: onboarding.orgSize,
        referralSource: onboarding.referralSource,
        signupMethod: onboarding.signupMethod,
        onboardingCompleted: onboarding.onboardingCompleted,
        createdAt: onboarding.createdAt,
        updatedAt: onboarding.updatedAt,
      });
    } catch (error) {
      logger.error(
        "Failed to get onboarding by user ID",
        { userId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get onboarding by user ID",
          error as Error,
          "OnboardingService.getOnboardingByUserId"
        )
      );
    }
  }

  /**
   * Get onboarding record by organization ID
   */
  static async getOnboardingByOrganizationId(
    organizationId: string
  ): Promise<ActionResult<OnboardingDto | null>> {
    try {
      const onboarding =
        await OnboardingQueries.getOnboardingByOrganizationId(organizationId);

      if (!onboarding) {
        return ok(null);
      }

      return ok({
        id: onboarding.id,
        userId: onboarding.userId,
        organizationId: onboarding.organizationId,
        signupType: onboarding.signupType,
        orgSize: onboarding.orgSize,
        referralSource: onboarding.referralSource,
        signupMethod: onboarding.signupMethod,
        onboardingCompleted: onboarding.onboardingCompleted,
        createdAt: onboarding.createdAt,
        updatedAt: onboarding.updatedAt,
      });
    } catch (error) {
      logger.error(
        "Failed to get onboarding by organization ID",
        { organizationId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get onboarding by organization ID",
          error as Error,
          "OnboardingService.getOnboardingByOrganizationId"
        )
      );
    }
  }

  /**
   * Get aggregated onboarding statistics
   */
  static async getOnboardingStats(): Promise<ActionResult<OnboardingStatsDto>> {
    try {
      const stats = await OnboardingQueries.getOnboardingStats();

      return ok({
        totalSignups: stats.totalSignups,
        individualSignups: stats.individualSignups,
        organizationSignups: stats.organizationSignups,
        signupMethods: stats.signupMethods,
        referralSources: stats.referralSources,
        averageOrgSize: stats.averageOrgSize,
      });
    } catch (error) {
      logger.error("Failed to get onboarding statistics", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get onboarding statistics",
          error as Error,
          "OnboardingService.getOnboardingStats"
        )
      );
    }
  }

  /**
   * Update onboarding completion status
   */
  static async updateOnboardingCompleted(
    id: string,
    completed: boolean
  ): Promise<ActionResult<void>> {
    try {
      await OnboardingQueries.updateOnboardingCompleted(id, completed);

      logger.info("Updated onboarding completion status", {
        onboardingId: id,
        completed,
      });

      return ok(undefined);
    } catch (error) {
      logger.error(
        "Failed to update onboarding completion status",
        { id, completed },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to update onboarding completion status",
          error as Error,
          "OnboardingService.updateOnboardingCompleted"
        )
      );
    }
  }
}

