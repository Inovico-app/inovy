"use server";

import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/rbac/permissions";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { getCalendarProvider } from "@/server/services/calendar/calendar-provider-factory";
import { z } from "zod";

/**
 * Get user's calendars from the connected calendar provider (Google or Microsoft).
 */
export const getCalendars = authorizedActionClient
  .metadata({
    name: "get-calendars",
    permissions: Permissions.integration.manage,
    audit: {
      resourceType: "calendar",
      action: "list",
      category: "read",
    },
  })
  .schema(z.void())
  .action(async ({ ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    // Resolve connected calendar provider (Google or Microsoft)
    const providerResult = await getCalendarProvider(user.id);

    if (providerResult.isErr()) {
      logger.error("Failed to resolve calendar provider", {
        userId: user.id,
        error: providerResult.error,
      });
      throw ActionErrors.badRequest(
        "No calendar account connected. Please connect Google or Microsoft in settings first.",
      );
    }

    const { provider } = providerResult.value;

    logger.info("Fetching user calendars", {
      userId: user.id,
    });

    const result = await provider.listCalendars(user.id);

    if (result.isErr()) {
      logger.error("Failed to fetch calendars", {
        userId: user.id,
        error: result.error.message,
        errorCode: result.error.code,
      });

      // Preserve the error type (badRequest for insufficient scopes, internal for others)
      if (result.error.code === "BAD_REQUEST") {
        throw ActionErrors.badRequest(result.error.message, "get-calendars");
      }

      throw ActionErrors.internal(
        result.error.message,
        result.error.cause,
        "get-calendars",
      );
    }

    return result.value;
  });
