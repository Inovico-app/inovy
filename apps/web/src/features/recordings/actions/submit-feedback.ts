"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { FeedbackQueries } from "@/server/data-access/feedback.queries";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { submitFeedbackSchema } from "@/server/validation/feedback/submit-feedback";

export const submitFeedbackAction = authorizedActionClient
  .metadata({
    name: "submit-feedback",
    permissions: policyToPermissions("recordings:read"),
    audit: {
      resourceType: "feedback",
      action: "create",
      category: "mutation",
    },
  })
  .schema(submitFeedbackSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;

    if (!user || !organizationId) {
      throw ActionErrors.unauthenticated(
        "User and organization context required",
      );
    }

    const recording = await RecordingsQueries.selectRecordingById(
      parsedInput.recordingId,
    );

    if (!recording || recording.organizationId !== organizationId) {
      throw ActionErrors.forbidden("Recording not found or not accessible");
    }

    logger.info("Submitting feedback", {
      component: "submit-feedback",
      userId: user.id,
      recordingId: parsedInput.recordingId,
      type: parsedInput.type,
      rating: parsedInput.rating,
    });

    try {
      await FeedbackQueries.create({
        organizationId,
        userId: user.id,
        recordingId: parsedInput.recordingId,
        type: parsedInput.type,
        rating: parsedInput.rating,
        comment: parsedInput.comment,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("unique constraint")
      ) {
        throw ActionErrors.conflict(
          "You have already submitted feedback for this type",
        );
      }
      throw ActionErrors.internal(
        "Failed to submit feedback",
        error,
        "submit-feedback",
      );
    }

    return { success: true };
  });
