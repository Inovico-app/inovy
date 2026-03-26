"use server";

import type { AuthContext } from "@/lib/auth-context";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { NotificationService } from "@/server/services/notification.service";
import { getNotificationsSchema } from "@/server/validation/notifications/get-notifications";

export const getNotificationsAction = authorizedActionClient
  .metadata({
    permissions: {},
    audit: {
      resourceType: "notification",
      action: "list",
      category: "read",
    },
  })
  .inputSchema(getNotificationsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId, userTeamIds } = ctx;

    if (!user || !organizationId) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "getNotificationsAction",
      );
    }

    const auth: AuthContext = {
      user,
      organizationId,
      userTeamIds: userTeamIds ?? [],
    };

    const result = await NotificationService.getNotifications(
      auth,
      parsedInput,
    );
    return resultToActionResponse(result);
  });
