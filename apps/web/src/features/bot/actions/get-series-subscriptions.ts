"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { BotSeriesSubscriptionsQueries } from "@/server/data-access/bot-series-subscriptions.queries";

export const getSeriesSubscriptionsAction = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:read") })
  .action(async ({ ctx }) => {
    const { user, organizationId } = ctx;
    if (!user || !organizationId) {
      throw new Error("User and organization context required");
    }
    return BotSeriesSubscriptionsQueries.findByUserAndOrg(
      user.id,
      organizationId,
    );
  });
