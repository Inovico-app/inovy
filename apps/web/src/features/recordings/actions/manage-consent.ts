"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { ok } from "neverthrow";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { logger } from "../../../lib/logger";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/server-action-client/action-client";
import {
  ActionErrors,
  type ActionError,
} from "../../../lib/server-action-client/action-errors";
import type { ConsentParticipant } from "../../../server/db/schema/consent";
import { ConsentService } from "../../../server/services/consent.service";
import {
  bulkGrantConsentSchema,
  grantConsentSchema,
  revokeConsentSchema,
} from "../../../server/validation/recordings/manage-consent";

/**
 * Grant consent for a participant
 */
export const grantConsentAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:update"),
  })
  .inputSchema(grantConsentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId, participantEmail, participantName, consentMethod } =
      parsedInput;
    const { user, organizationId } = ctx;

    if (!user || !organizationId) {
      throw ActionErrors.forbidden(
        "Authentication required",
        undefined,
        "grant-consent"
      );
    }

    // Get IP address and user agent for audit
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    const result = await ConsentService.grantConsent(
      recordingId,
      participantEmail,
      participantName,
      consentMethod,
      user.id,
      organizationId,
      ipAddress,
      userAgent
    );

    if (result.isErr()) {
      throw result.error;
    }

    // Revalidate recording page
    revalidatePath(`/projects/[projectId]/recordings/${recordingId}`);

    return resultToActionResponse(result);
  });

/**
 * Revoke consent for a participant
 */
export const revokeConsentAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:update"),
  })
  .inputSchema(revokeConsentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId, participantEmail } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user || !organizationId) {
      throw ActionErrors.forbidden(
        "Authentication required",
        undefined,
        "revoke-consent"
      );
    }

    const result = await ConsentService.revokeConsent(
      recordingId,
      participantEmail,
      user.id,
      organizationId
    );

    if (result.isErr()) {
      throw result.error;
    }

    // Revalidate recording page using dynamic route pattern
    revalidatePath("/projects/[projectId]/recordings/[recordingId]", "page");

    return resultToActionResponse(result);
  });

/**
 * Bulk grant consent for multiple participants
 */
export const bulkGrantConsentAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:update"),
  })
  .inputSchema(bulkGrantConsentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId, participants, consentMethod } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user || !organizationId) {
      throw ActionErrors.forbidden(
        "Authentication required",
        undefined,
        "bulk-grant-consent"
      );
    }

    // Get IP address and user agent for audit
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Grant consent for each participant using Promise.allSettled for partial success handling
    const results = await Promise.allSettled(
      participants.map((participant) =>
        ConsentService.grantConsent(
          recordingId,
          participant.email,
          participant.name,
          consentMethod,
          user.id,
          organizationId,
          ipAddress,
          userAgent
        )
      )
    );

    // Separate successes and failures
    const successfulResults: ConsentParticipant[] = [];
    const failures: ActionError[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.isOk()) {
          successfulResults.push(result.value.value);
        } else {
          failures.push(result.value.error);
        }
      } else {
        // Promise rejection (shouldn't happen with Result types, but handle defensively)
        failures.push(
          ActionErrors.internal(
            "Unexpected error during bulk consent grant",
            result.reason as Error,
            "bulkGrantConsentAction"
          )
        );
      }
    }

    // If all failed, throw the first error
    if (failures.length > 0 && successfulResults.length === 0) {
      throw failures[0];
    }

    // If some failed, log warnings but return successes
    if (failures.length > 0) {
      logger.warn("Some consent grants failed in bulk operation", {
        component: "bulkGrantConsentAction",
        total: participants.length,
        succeeded: successfulResults.length,
        failed: failures.length,
      });
    }

    // Revalidate recording page using dynamic route pattern
    revalidatePath("/projects/[projectId]/recordings/[recordingId]", "page");

    return resultToActionResponse(ok(successfulResults));
  });

