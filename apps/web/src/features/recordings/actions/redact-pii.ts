"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  createErrorForNextSafeAction,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { RedactionService } from "@/server/services/redaction.service";
import {
  applyAutomaticRedactionsSchema,
  bulkRedactionSchema,
  createRedactionSchema,
  detectPIISchema,
} from "@/server/validation/redaction.schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Detect PII in a recording's transcript
 */
export const detectPIIAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:read"),
  })
  .inputSchema(detectPIISchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId, minConfidence } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User not found", "detect-pii");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "detect-pii"
      );
    }

    const result = await RedactionService.detectPII(
      recordingId,
      organizationId,
      minConfidence
    );

    if (result.isErr()) {
      throw createErrorForNextSafeAction(result.error);
    }

    return resultToActionResponse(result);
  });

/**
 * Create a single redaction
 */
export const createRedactionAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:update"),
  })
  .inputSchema(createRedactionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId, ...redactionData } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User not found", "create-redaction");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "create-redaction"
      );
    }

    const result = await RedactionService.createRedaction(
      {
        recordingId,
        ...redactionData,
      },
      user.id,
      organizationId
    );

    if (result.isErr()) {
      throw createErrorForNextSafeAction(result.error);
    }

    // Revalidate recording page
    revalidatePath(`/projects/[projectId]/recordings/${recordingId}`, "page");

    return resultToActionResponse(result);
  });

/**
 * Create multiple redactions in bulk
 */
export const createBulkRedactionsAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:update"),
  })
  .inputSchema(bulkRedactionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId, redactions } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "create-bulk-redactions"
      );
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "create-bulk-redactions"
      );
    }

    const result = await RedactionService.createBulkRedactions(
      {
        recordingId,
        redactions,
      },
      user.id,
      organizationId
    );

    if (result.isErr()) {
      throw createErrorForNextSafeAction(result.error);
    }

    // Revalidate recording page
    revalidatePath(`/projects/[projectId]/recordings/${recordingId}`, "page");

    return resultToActionResponse(result);
  });

/**
 * Get all redactions for a recording
 */
export const getRedactionsAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:read"),
  })
  .inputSchema(z.object({ recordingId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "get-redactions"
      );
    }

    const result = await RedactionService.getRedactions(
      recordingId,
      organizationId
    );

    if (result.isErr()) {
      throw createErrorForNextSafeAction(result.error);
    }

    return resultToActionResponse(result);
  });

/**
 * Delete a redaction
 */
export const deleteRedactionAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:update"),
  })
  .inputSchema(z.object({ redactionId: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { redactionId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "delete-redaction"
      );
    }

    const result = await RedactionService.deleteRedaction(
      redactionId,
      organizationId
    );

    if (result.isErr()) {
      throw createErrorForNextSafeAction(result.error);
    }

    // Revalidate recording page (we'll need to get recordingId from redaction)
    revalidatePath(`/projects/[projectId]/recordings/[recordingId]`, "page");

    return resultToActionResponse(result);
  });

/**
 * Apply automatic PII detection and create redactions
 */
export const applyAutomaticRedactionsAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:update"),
  })
  .inputSchema(applyAutomaticRedactionsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId, minConfidence } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "apply-automatic-redactions"
      );
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "apply-automatic-redactions"
      );
    }

    const result = await RedactionService.applyAutomaticRedactions(
      recordingId,
      user.id,
      organizationId,
      minConfidence
    );

    if (result.isErr()) {
      throw createErrorForNextSafeAction(result.error);
    }

    // Revalidate recording page
    revalidatePath(`/projects/[projectId]/recordings/${recordingId}`, "page");

    return resultToActionResponse(result);
  });

