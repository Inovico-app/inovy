"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { ok } from "neverthrow";
import { ConsentService } from "../../../server/services/consent.service";
import {
  bulkGrantConsentSchema,
  grantConsentSchema,
  revokeConsentSchema,
} from "../../../server/validation/recordings/manage-consent";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

/**
 * Grant consent for a participant
 */
export const grantConsentAction = authorizedActionClient
  .metadata({
    policy: "recordings:update",
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
    policy: "recordings:update",
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

    // Revalidate recording page
    revalidatePath(`/projects/[projectId]/recordings/${recordingId}`);

    return resultToActionResponse(result);
  });

/**
 * Bulk grant consent for multiple participants
 */
export const bulkGrantConsentAction = authorizedActionClient
  .metadata({
    policy: "recordings:update",
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

    // Grant consent for each participant
    const results = await Promise.all(
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

    // Check for errors
    const errors = results.filter((r) => r.isErr());
    if (errors.length > 0) {
      throw errors[0].error;
    }

    // Revalidate recording page
    revalidatePath(`/projects/[projectId]/recordings/${recordingId}`);

    const successfulResults = results
      .map((r) => (r.isOk() ? r.value : null))
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return resultToActionResponse(ok(successfulResults));
  });

