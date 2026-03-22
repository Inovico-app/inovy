"use server";

import type { AuthContext } from "@/lib/auth-context";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { NotificationService } from "@/server/services/notification.service";

export const markAllNotificationsReadAction = authorizedActionClient
  .metadata({
    permissions: {},
    audit: {
      resourceType: "notification",
      action: "mark_read",
      category: "mutation",
    },
  })
  .action(async ({ ctx }) => {
    const { user, organizationId, userTeamIds } = ctx;

    if (!user || !organizationId) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "markAllNotificationsReadAction",
      );
    }

    const auth: AuthContext = {
      user,
      organizationId,
      userTeamIds: userTeamIds ?? [],
    };

    const result = await NotificationService.markAllAsRead(auth);
    const count = resultToActionResponse(result);
    return { count };
  });
