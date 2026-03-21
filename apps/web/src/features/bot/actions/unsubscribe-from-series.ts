"use server";

import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { unsubscribeFromSeriesSchema } from "@/server/validation/bot/unsubscribe-from-series.schema";
import { BotSeriesSubscriptionsQueries } from "@/server/data-access/bot-series-subscriptions.queries";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { BotProviderFactory } from "@/server/services/bot-providers/factory";
import { logger, serializeError } from "@/lib/logger";

export const unsubscribeFromSeriesAction = authorizedActionClient
  .metadata({
    name: "unsubscribe-from-series",
    permissions: policyToPermissions("recordings:delete"),
    audit: {
      resourceType: "bot_subscription",
      action: "unsubscribe",
      category: "mutation",
    },
  })
  .schema(unsubscribeFromSeriesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { subscriptionId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "unsubscribe-from-series",
      );
    }

    // Deactivate subscription
    const subscription = await BotSeriesSubscriptionsQueries.deactivate(
      subscriptionId,
      organizationId,
    );
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Cancel all pending bot sessions for this subscription
    const pendingSessions = await BotSessionsQueries.findBySubscriptionId(
      subscriptionId,
      organizationId,
      "scheduled",
    );

    const botProvider = BotProviderFactory.getDefault();
    let cancelledCount = 0;
    const failedTerminations: string[] = [];

    for (const session of pendingSessions) {
      try {
        await botProvider.terminateSession(session.recallBotId);
        await BotSessionsQueries.update(session.id, organizationId, {
          botStatus: "failed",
          error: "Subscription cancelled",
        });
        cancelledCount++;
      } catch (error) {
        logger.error("Failed to cancel bot session on unsubscribe", {
          component: "unsubscribeFromSeriesAction",
          sessionId: session.id,
          error: serializeError(error),
        });
        // Leave session status unchanged — don't mark as failed on termination errors
        failedTerminations.push(session.id);
      }
    }

    return {
      cancelledSessions: cancelledCount,
      failedTerminations: failedTerminations.length,
    };
  });
