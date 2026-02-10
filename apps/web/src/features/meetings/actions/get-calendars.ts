"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { z } from "zod";

/**
 * Get user's Google calendars
 */
export const getCalendars = authorizedActionClient
  .metadata({ permissions: policyToPermissions("settings:read") })
  .schema(z.void())
  .action(async ({ ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    // Check if user has Google connection
    const hasConnection = await GoogleOAuthService.hasConnection(user.id);

    if (hasConnection.isErr() || !hasConnection.value) {
      throw ActionErrors.badRequest(
        "Google account not connected. Please connect in settings first."
      );
    }

    logger.info("Fetching user calendars", {
      userId: user.id,
    });

    const result = await GoogleCalendarService.getCalendarsList(user.id);

    if (result.isErr()) {
      logger.error("Failed to fetch calendars", {
        userId: user.id,
        error: result.error.message,
        errorCode: result.error.code,
      });

      // Preserve the error type (badRequest for insufficient scopes, internal for others)
      if (result.error.code === "BAD_REQUEST") {
        throw ActionErrors.badRequest(
          result.error.message,
          "get-calendars"
        );
      }

      throw ActionErrors.internal(
        result.error.message,
        result.error.cause,
        "get-calendars"
      );
    }

    return result.value;
  });

