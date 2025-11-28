"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { GdprDeletionService } from "@/server/services/gdpr-deletion.service";
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
    permissions: policyToPermissions("settings:update"), // User can manage their own settings
  })
  .inputSchema(requestDeletionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { confirmationText, confirmCheckbox } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User not found", "request-deletion");
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
    const displayName =
      user.given_name && user.family_name
        ? `${user.given_name} ${user.family_name}`
        : (user.given_name ?? user.family_name ?? null);

    const processResult = await GdprDeletionService.processDeletionRequest(
      result.value,
      user.id,
      organizationId,
      user.email ?? null,
      displayName
    );

    if (processResult.isErr()) {
      logger.error("Failed to process deletion request", {
        component: "requestDeletionAction",
        userId: user.id,
        error: processResult.error,
      });
      throw processResult.error;
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
    permissions: policyToPermissions("settings:update"),
  })
  .inputSchema(cancelDeletionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { requestId } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User not found", "cancel-deletion");
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
 * Auth is handled internally by the service
 */
export const getDeletionStatusAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("settings:read"),
  })
  .action(async () => {
    const result = await GdprDeletionService.getDeletionRequestStatus();

    if (result.isErr()) {
      throw result.error;
    }

    return { data: result.value };
  });

