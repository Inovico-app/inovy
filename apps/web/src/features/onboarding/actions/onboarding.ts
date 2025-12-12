"use server";

import { auth } from "@/lib/auth";
import {
  authorizedActionClient,
  createErrorForNextSafeAction,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { OnboardingQueries } from "@/server/data-access/onboarding.queries";
import { OrganizationQueries } from "@/server/data-access/organization.queries";
import { UserQueries } from "@/server/data-access/user.queries";
import { OnboardingService } from "@/server/services/onboarding.service";
import { headers } from "next/headers";
import { z } from "zod";

const updateOnboardingSchema = z.object({
  onboardingId: z.uuid(),
  name: z.string().min(1).optional(),
  signupType: z.enum(["individual", "organization"]),
  organizationName: z.string().min(1).optional(),
  orgSize: z.number().int().positive().optional(),
  researchQuestion: z.string().optional(),
  referralSource: z.string().optional(),
  referralSourceOther: z.string().optional(),
  newsletterOptIn: z.boolean().optional(),
});

/**
 * Complete onboarding - saves onboarding data and marks user as completed
 */
export const completeOnboardingAction = authorizedActionClient
  .inputSchema(updateOnboardingSchema)
  .metadata({ permissions: {}, name: "complete-onboarding" })
  .action(async ({ parsedInput, ctx }) => {
    const {
      onboardingId,
      name,
      signupType,
      orgSize,
      researchQuestion,
      referralSource,
      referralSourceOther,
      newsletterOptIn,
    } = parsedInput;
    const userId = ctx.user?.id;

    if (!userId) {
      throw createErrorForNextSafeAction(
        ActionErrors.unauthenticated("User not found")
      );
    }

    // Verify the onboarding belongs to this user
    const onboardingResult =
      await OnboardingService.getOnboardingByUserId(userId);

    if (onboardingResult.isErr()) {
      throw createErrorForNextSafeAction(onboardingResult.error);
    }

    const onboarding = onboardingResult.value;
    if (!onboarding || onboarding.id !== onboardingId) {
      throw createErrorForNextSafeAction(
        ActionErrors.forbidden("Onboarding record not found or access denied")
      );
    }

    // Update user's name if provided
    // Use Better Auth API directly since we're updating the current user
    if (name && name.trim().length > 0) {
      try {
        const requestHeaders = await headers();
        const updatedUser = await UserQueries.updateUser(
          {
            name: name.trim(),
          },
          requestHeaders
        );

        if (!updatedUser) {
          throw createErrorForNextSafeAction(
            ActionErrors.internal("Failed to update user name")
          );
        }
      } catch (error) {
        throw createErrorForNextSafeAction(
          ActionErrors.internal("Failed to update user name", error as Error)
        );
      }
    }

    // Get user's organization (should exist from signup)
    const organizationId =
      await OrganizationQueries.getFirstOrganizationForUser(userId);

    if (!organizationId) {
      throw createErrorForNextSafeAction(
        ActionErrors.internal(
          "User organization not found. Please contact support.",
          undefined,
          "completeOnboardingAction"
        )
      );
    }

    await OnboardingQueries.updateOnboardingData(onboardingId, {
      signupType,
      orgSize: orgSize ?? null,
      researchQuestion: researchQuestion ?? null,
      referralSource: referralSource ?? null,
      referralSourceOther: referralSourceOther ?? null,
      newsletterOptIn:
        newsletterOptIn !== undefined ? newsletterOptIn : undefined,
      organizationId, // Link onboarding to user's organization
    });

    // Mark onboarding as completed (also updates user's onboardingCompleted status)
    const updateResult = await OnboardingService.updateOnboardingCompleted(
      onboardingId,
      true
    );

    if (updateResult.isErr()) {
      throw createErrorForNextSafeAction(updateResult.error);
    }

    // revoke all sessions and use a fresh one
    try {
      await auth.api.revokeSessions({
        headers: await headers(),
      });
    } catch (error) {
      throw createErrorForNextSafeAction(
        ActionErrors.internal("Failed to revoke sessions", error as Error)
      );
    }

    return { success: true };
  });

/**
 * Create onboarding record (called after signup)
 */
export const createOnboardingRecordAction = authorizedActionClient
  .inputSchema(
    z.object({
      signupMethod: z.enum([
        "email",
        "google",
        "microsoft",
        "magic_link",
        "passkey",
      ]),
    })
  )
  .metadata({
    permissions: { onboarding: ["create"] },
    name: "create-onboarding-record",
  })
  .action(async ({ parsedInput, ctx }) => {
    const { signupMethod } = parsedInput;
    const userId = ctx.user?.id;

    if (!userId) {
      throw createErrorForNextSafeAction(
        ActionErrors.unauthenticated("User not found")
      );
    }

    // Check if onboarding already exists
    const existingResult =
      await OnboardingService.getOnboardingByUserId(userId);

    if (existingResult.isErr()) {
      throw createErrorForNextSafeAction(existingResult.error);
    }

    if (existingResult.value) {
      // Already exists, return it
      return { onboardingId: existingResult.value.id };
    }

    // Create new onboarding record with default values
    // User will complete it via the onboarding form
    const createResult = await OnboardingService.createOnboarding({
      userId,
      signupType: "individual", // Default, can be updated in form
      signupMethod,
    });

    if (createResult.isErr()) {
      throw createErrorForNextSafeAction(createResult.error);
    }

    return { onboardingId: createResult.value.id };
  });

/**
 * Update onboarding data (called during onboarding form)
 */
export const updateOnboardingDataAction = authorizedActionClient
  .inputSchema(updateOnboardingSchema)
  .metadata({ permissions: {}, name: "update-onboarding-data" })
  .action(async ({ parsedInput, ctx }) => {
    const {
      onboardingId,
      name,
      signupType,
      organizationName,
      orgSize,
      researchQuestion,
      referralSource,
      referralSourceOther,
      newsletterOptIn,
    } = parsedInput;
    const userId = ctx.user?.id;

    if (!userId) {
      throw createErrorForNextSafeAction(
        ActionErrors.unauthenticated("User not found")
      );
    }

    // Verify the onboarding belongs to this user
    const onboardingResult =
      await OnboardingService.getOnboardingByUserId(userId);

    if (onboardingResult.isErr()) {
      throw createErrorForNextSafeAction(
        ActionErrors.notFound("Onboarding", "updateOnboardingDataAction")
      );
    }

    const onboarding = onboardingResult.value;
    if (!onboarding || onboarding.id !== onboardingId) {
      throw createErrorForNextSafeAction(
        ActionErrors.forbidden("Onboarding record not found or access denied")
      );
    }

    // Update user's name if provided (for step 1)
    // Use Better Auth API directly since we're updating the current user
    if (name && name.trim().length > 0) {
      try {
        const requestHeaders = await headers();
        const updatedUser = await UserQueries.updateUser(
          {
            name: name.trim(),
          },
          requestHeaders
        );

        if (!updatedUser) {
          throw createErrorForNextSafeAction(
            ActionErrors.internal("Failed to update user name")
          );
        }
      } catch (error) {
        throw createErrorForNextSafeAction(
          ActionErrors.internal("Failed to update user name", error as Error)
        );
      }
    }

    // Update organization name if provided (for organization signups)
    if (organizationName && organizationName.trim().length > 0) {
      try {
        const requestHeaders = await headers();
        const organizationId =
          await OrganizationQueries.getFirstOrganizationForUser(userId);

        if (!organizationId) {
          throw createErrorForNextSafeAction(
            ActionErrors.internal(
              "User organization not found. Please contact support.",
              undefined,
              "updateOnboardingDataAction"
            )
          );
        }

        // Get current organization to preserve slug
        const currentOrg = await OrganizationQueries.findById(
          organizationId,
          requestHeaders
        );

        if (!currentOrg) {
          throw createErrorForNextSafeAction(
            ActionErrors.internal(
              "Organization not found",
              undefined,
              "updateOnboardingDataAction"
            )
          );
        }

        // Update organization name, keeping the existing slug
        await auth.api.updateOrganization({
          headers: requestHeaders,
          body: {
            organizationId,
            data: {
              name: organizationName.trim(),
              slug: currentOrg.slug, // Keep existing slug
            },
          },
        });
      } catch (error) {
        throw createErrorForNextSafeAction(
          ActionErrors.internal(
            "Failed to update organization name",
            error as Error,
            "updateOnboardingDataAction"
          )
        );
      }
    }

    await OnboardingQueries.updateOnboardingData(onboardingId, {
      signupType,
      orgSize: orgSize ?? null,
      researchQuestion: researchQuestion ?? null,
      referralSource: referralSource ?? null,
      referralSourceOther: referralSourceOther ?? null,
      newsletterOptIn:
        newsletterOptIn !== undefined ? newsletterOptIn : undefined,
    });

    return { success: true };
  });

