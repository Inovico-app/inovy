"use server";

import type { AuthContext } from "@/lib/auth-context";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { NotificationService } from "@/server/services/notification.service";
import { markAsReadSchema } from "@/server/validation/notifications/mark-as-read";

export const markNotificationReadAction = authorizedActionClient
  .metadata({
    permissions: {},
    audit: {
      resourceType: "notification",
      action: "mark_read",
      category: "mutation",
    },
  })
  .inputSchema(markAsReadSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId, userTeamIds } = ctx;

    if (!user || !organizationId) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "markNotificationReadAction",
      );
    }

    const auth: AuthContext = {
      user,
      organizationId,
      userTeamIds: userTeamIds ?? [],
    };

    const { notificationId } = parsedInput;
    const result = await NotificationService.markAsRead(notificationId, auth);
    return resultToActionResponse(result);
  });
