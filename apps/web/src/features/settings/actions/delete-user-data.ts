"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { GdprDeletionService } from "@/server/services";
import {
  cancelDeletionSchema,
  requestDeletionSchema,
} from "@/server/validation/gdpr-deletion.schema";
import { revalidatePath } from "next/cache";

/**
 * Request user data deletion action
 * Creates a deletion request with 30-day recovery period
 */
export const requestDeletionAction = authorizedActionClient
  .metadata({
    policy: "settings:update", // User can manage their own settings
  })
  .inputSchema(requestDeletionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { confirmationText, confirmCheckbox } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "request-deletion"
      );
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "request-deletion"
      );
    }

    // Validate confirmation
    if (confirmationText !== "DELETE MY DATA") {
      throw ActionErrors.validation(
        "Confirmation text must be exactly 'DELETE MY DATA'",
        { confirmationText }
      );
    }

    if (!confirmCheckbox) {
      throw ActionErrors.validation(
        "You must confirm that you understand the consequences",
        { confirmCheckbox }
      );
    }

    // Create deletion request
    const result = await GdprDeletionService.createDeletionRequest(
      user.id,
      organizationId
    );

    if (result.isErr()) {
      throw result.error;
    }

    // Process deletion immediately (soft delete with anonymization)
    const authResult = await getAuthSession();
    if (authResult.isOk() && authResult.value.user) {
      const processResult = await GdprDeletionService.processDeletionRequest(
        result.value,
        user.id,
        organizationId,
        user.email,
        user.given_name && user.family_name
          ? `${user.given_name} ${user.family_name}`
          : user.given_name || null
      );

      if (processResult.isErr()) {
        logger.error("Failed to process deletion request", {
          component: "requestDeletionAction",
          userId: user.id,
          error: processResult.error,
        });
        throw processResult.error;
      }
    }

    revalidatePath("/settings/profile");

    return { data: { success: true, requestId: result.value } };
  });

/**
 * Cancel deletion request action
 * Allows user to cancel deletion before permanent deletion (within 30 days)
 */
export const cancelDeletionAction = authorizedActionClient
  .metadata({
    policy: "settings:update",
  })
  .inputSchema(cancelDeletionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { requestId } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "cancel-deletion"
      );
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "cancel-deletion"
      );
    }

    const result = await GdprDeletionService.cancelDeletionRequest(
      requestId,
      user.id,
      user.id
    );

    if (result.isErr()) {
      throw result.error;
    }

    revalidatePath("/settings/profile");

    return { data: { success: true } };
  });

/**
 * Get deletion request status action
 */
export const getDeletionStatusAction = authorizedActionClient
  .metadata({
    policy: "settings:read",
  })
  .action(async ({ ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "get-deletion-status"
      );
    }

    const result = await GdprDeletionService.getDeletionRequestStatus(user.id);

    if (result.isErr()) {
      throw result.error;
    }

    return { data: result.value };
  });

