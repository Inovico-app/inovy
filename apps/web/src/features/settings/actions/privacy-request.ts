"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { PrivacyRequestService } from "@/server/services/privacy-request.service";
import {
  submitPrivacyRequestSchema,
  withdrawPrivacyRequestSchema,
} from "@/server/validation/privacy-request.schema";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

/**
 * Submit a privacy request (Right to Restriction or Right to Object)
 * GDPR Art. 18 and Art. 21
 */
export const submitPrivacyRequestAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("settings:update"),
    name: "submit-privacy-request",
    audit: {
      resourceType: "privacy_request",
      action: "create",
      category: "mutation",
    },
  })
  .inputSchema(submitPrivacyRequestSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { type, scope, reason } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "submit-privacy-request",
      );
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "submit-privacy-request",
      );
    }

    // Extract IP and user agent for audit trail
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersList.get("x-real-ip") ??
      undefined;
    const userAgent = headersList.get("user-agent") ?? undefined;

    const result = await PrivacyRequestService.submitRequest({
      userId: user.id,
      organizationId,
      type,
      scope,
      reason,
      ipAddress,
      userAgent,
    });

    if (result.isErr()) {
      throw result.error;
    }

    logger.info("Privacy request submitted via action", {
      component: "submitPrivacyRequestAction",
      userId: user.id,
      type,
      scope,
    });

    revalidatePath("/settings/profile");

    return { data: { success: true, requestId: result.value.id } };
  });

/**
 * Withdraw a privacy request
 */
export const withdrawPrivacyRequestAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("settings:update"),
    name: "withdraw-privacy-request",
    audit: {
      resourceType: "privacy_request",
      action: "delete",
      category: "mutation",
    },
  })
  .inputSchema(withdrawPrivacyRequestSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { requestId } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "withdraw-privacy-request",
      );
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "withdraw-privacy-request",
      );
    }

    const result = await PrivacyRequestService.withdrawRequest(
      requestId,
      user.id,
      organizationId,
    );

    if (result.isErr()) {
      throw result.error;
    }

    revalidatePath("/settings/profile");

    return { data: { success: true } };
  });

/**
 * Get active privacy requests for the current user
 */
export const getPrivacyRequestsAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("settings:read"),
    name: "get-privacy-requests",
    audit: {
      resourceType: "privacy_request",
      action: "list",
      category: "read",
    },
  })
  .action(async ({ ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "get-privacy-requests",
      );
    }

    const result = await PrivacyRequestService.getRequestHistory(user.id);

    if (result.isErr()) {
      throw result.error;
    }

    return { data: result.value };
  });
