"use server";

import { CacheInvalidation } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  createErrorForNextSafeAction,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { updateMeetingDetailsSchema } from "@/server/validation/meetings/update-meeting-details.schema";

/**
 * Update Google Calendar event details (title, date/time, optionally add Meet link)
 */
export const updateMeetingDetails = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:create"),
    name: "update-meeting-details",
  })
  .schema(updateMeetingDetailsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    const hasConnection = await GoogleOAuthService.hasConnection(user.id);

    if (hasConnection.isErr() || !hasConnection.value) {
      throw ActionErrors.badRequest(
        "Google account not connected. Please connect in settings first."
      );
    }

    const { calendarEventId, title, start, end, addMeetLinkIfMissing } =
      parsedInput;

    if (start !== undefined && end !== undefined && end.getTime() <= start.getTime()) {
      throw createErrorForNextSafeAction(
        ActionErrors.badRequest("End must be after start", "update-meeting-details")
      );
    }

    logger.info("Updating meeting details", {
      userId: user.id,
      organizationId,
      calendarEventId,
    });

    const result = await GoogleCalendarService.updateEvent(
      user.id,
      calendarEventId,
      {
        title,
        start,
        end,
        addMeetLinkIfMissing,
      }
    );

    if (result.isErr()) {
      logger.error("Failed to update meeting details", {
        userId: user.id,
        calendarEventId,
        error: result.error.message,
      });
      throw createErrorForNextSafeAction(result.error);
    }

    CacheInvalidation.invalidateCalendarMeetings(user.id, organizationId);

    logger.info("Successfully updated meeting details", {
      userId: user.id,
      calendarEventId,
    });

    return {
      success: true,
      eventUrl: result.value.eventUrl,
      meetingUrl: result.value.meetingUrl,
    } as const;
  });
