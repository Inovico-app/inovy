"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { getConnectedProviders } from "@/server/services/calendar/calendar-provider-factory";
import { z } from "zod";

/**
 * Return which calendar providers (google / microsoft) the current user has connected.
 */
export const getConnectedCalendarProviders = authorizedActionClient
  .metadata({ permissions: policyToPermissions("settings:read") })
  .schema(z.void())
  .action(async ({ ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    const providers = await getConnectedProviders(user.id);
    return { providers };
  });
