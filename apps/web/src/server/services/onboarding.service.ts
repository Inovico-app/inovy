import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { err, ok } from "neverthrow";
import {
  OnboardingQueries,
  type UpdateOnboardingData,
} from "../data-access/onboarding.queries";
import { UserQueries } from "../data-access/user.queries";
import type {
  CreateOnboardingDto,
  OnboardingDto,
  OnboardingStatsDto,
} from "../dto/onboarding.dto";
import { UserService } from "./user.service";

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
        researchQuestion: onboarding.researchQuestion ?? null,
        referralSource: onboarding.referralSource,
        referralSourceOther: onboarding.referralSourceOther ?? null,
        googleConnectedDuringOnboarding:
          onboarding.googleConnectedDuringOnboarding,
        newsletterOptIn: onboarding.newsletterOptIn,
        signupMethod: onboarding.signupMethod,
        onboardingCompleted: onboarding.onboardingCompleted,
        createdAt: onboarding.createdAt,
        updatedAt: onboarding.updatedAt,
      });
    } catch (error) {
      logger.error(
        "Failed to create onboarding record",
        { data },
        error as Error
      );
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
        researchQuestion: onboarding.researchQuestion ?? null,
        referralSource: onboarding.referralSource,
        referralSourceOther: onboarding.referralSourceOther ?? null,
        googleConnectedDuringOnboarding:
          onboarding.googleConnectedDuringOnboarding,
        newsletterOptIn: onboarding.newsletterOptIn,
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
        researchQuestion: onboarding.researchQuestion ?? null,
        referralSource: onboarding.referralSource,
        referralSourceOther: onboarding.referralSourceOther ?? null,
        googleConnectedDuringOnboarding:
          onboarding.googleConnectedDuringOnboarding,
        newsletterOptIn: onboarding.newsletterOptIn,
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
   * Also updates the user's onboardingCompleted status
   */
  static async updateOnboardingCompleted(
    id: string,
    completed: boolean
  ): Promise<ActionResult<boolean>> {
    try {
      // Get onboarding record to get userId
      const onboarding = await OnboardingQueries.getOnboardingById(id);

      if (!onboarding) {
        return err(
          ActionErrors.notFound(
            "Onboarding",
            "OnboardingService.updateOnboardingCompleted"
          )
        );
      }

      // Update onboarding record
      await OnboardingQueries.updateOnboardingCompleted(id, completed);

      // Update user's onboardingCompleted status if userId exists
      if (onboarding.userId) {
        const userUpdateResult = await UserService.updateOnboardingCompleted(
          onboarding.userId,
          completed
        );

        if (userUpdateResult.isErr()) {
          const errorCause =
            userUpdateResult.error.cause instanceof Error
              ? userUpdateResult.error.cause
              : undefined;
          logger.error(
            "Failed to update user onboarding completed status",
            {
              userId: onboarding.userId,
              onboardingId: id,
              completed,
              errorCode: userUpdateResult.error.code,
              errorMessage: userUpdateResult.error.message,
            },
            errorCause
          );
          // Continue even if user update fails - onboarding record is updated
        }
      }

      logger.info("Updated onboarding completion status", {
        onboardingId: id,
        userId: onboarding.userId ?? undefined,
        completed,
      });

      return ok(true);
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

  static async updateOnboardingData(
    onboardingId: string,
    data: UpdateOnboardingData
  ): Promise<ActionResult<boolean>> {
    try {
      await OnboardingQueries.updateOnboardingData(onboardingId, data);
    } catch (error) {
      const { organizationId: _, ...rest } = data;
      logger.error(
        "Failed to update user onboarding",
        { onboardingId, data: rest },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to update user onboarding",
          error as Error,
          "OnboardingService.updateUserOnboarding"
        )
      );
    }
    return ok(true);
  }

  /**
   * Ensure onboarding record exists for a user
   * Creates one if it doesn't exist, determining signup method from user accounts
   */
  static async ensureOnboardingRecordExists(
    userId: string,
    requestHeaders?: Headers
  ): Promise<ActionResult<OnboardingDto>> {
    try {
      // Check if onboarding already exists
      const existingResult = await this.getOnboardingByUserId(userId);

      if (existingResult.isErr()) {
        return err(existingResult.error);
      }

      if (existingResult.value) {
        return ok(existingResult.value);
      }

      // Determine signup method from user accounts
      const userAccounts = await UserQueries.listAccounts(requestHeaders);
      let signupMethod:
        | "email"
        | "google"
        | "microsoft"
        | "magic_link"
        | "passkey" = "email";

      if (userAccounts.length > 0) {
        const account = userAccounts[0];
        if (account.providerId === "google") {
          signupMethod = "google";
        } else if (account.providerId === "microsoft") {
          signupMethod = "microsoft";
        } else if (account.providerId === "magic-link") {
          signupMethod = "magic_link";
        } else if (account.providerId === "passkey") {
          signupMethod = "passkey";
        } else if (account.providerId === "credential") {
          signupMethod = "email";
        }
      }

      // Create onboarding record
      const createResult = await this.createOnboarding({
        userId,
        signupType: "individual",
        signupMethod,
      });

      if (createResult.isErr()) {
        return err(createResult.error);
      }

      logger.info("Created onboarding record for user", {
        userId,
        onboardingId: createResult.value.id,
        signupMethod,
      });

      return ok(createResult.value);
    } catch (error) {
      logger.error(
        "Failed to ensure onboarding record exists",
        { userId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to ensure onboarding record exists",
          error as Error,
          "OnboardingService.ensureOnboardingRecordExists"
        )
      );
    }
  }
}

