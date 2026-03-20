// src/server/services/bot-calendar-monitor.service.ts
import { err, ok } from "neverthrow";
import { logger, serializeError } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { BotSeriesSubscriptionsQueries } from "@/server/data-access/bot-series-subscriptions.queries";
import { BotBackfillService } from "@/server/services/bot-backfill.service";
import type { BotSeriesSubscription } from "@/server/db/schema/bot-series-subscriptions";

/**
 * Bot Calendar Monitor Service
 * Monitors subscribed recurring series for upcoming instances
 * and creates bot sessions for them.
 */
export class BotCalendarMonitorService {
  /**
   * Monitor calendars for all users with active series subscriptions.
   * Only processes users who also have botEnabled: true.
   */
  static async monitorCalendars(): Promise<
    ActionResult<{
      usersProcessed: number;
      sessionsCreated: number;
      errors: Array<{ userId: string; error: string }>;
    }>
  > {
    try {
      logger.info("Starting calendar monitoring workflow", {
        component: "BotCalendarMonitorService.monitorCalendars",
      });

      // Get all active subscriptions where user has botEnabled: true
      const subscriptions =
        await BotSeriesSubscriptionsQueries.findAllActiveWithBotEnabled();

      // Group subscriptions by (userId, organizationId)
      const grouped = new Map<
        string,
        {
          botSettings: {
            userId: string;
            organizationId: string;
            botDisplayName: string;
            botJoinMessage: string | null;
          };
          subscriptions: Array<
            BotSeriesSubscription & {
              botDisplayName: string;
              botJoinMessage: string | null;
            }
          >;
        }
      >();

      for (const sub of subscriptions) {
        const key = `${sub.userId}:${sub.organizationId}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            botSettings: {
              userId: sub.userId,
              organizationId: sub.organizationId,
              botDisplayName: sub.botDisplayName,
              botJoinMessage: sub.botJoinMessage,
            },
            subscriptions: [],
          });
        }
        grouped.get(key)!.subscriptions.push(sub);
      }

      logger.info("Found users with active subscriptions", {
        component: "BotCalendarMonitorService.monitorCalendars",
        userCount: grouped.size,
        totalSubscriptions: subscriptions.length,
      });

      const results = {
        usersProcessed: 0,
        sessionsCreated: 0,
        errors: [] as Array<{ userId: string; error: string }>,
      };

      // Time window: 10-20 minutes from now (same as before)
      const now = new Date();
      const timeMin = new Date(now.getTime() + (10 * 60 + 15 + 5) * 1000);
      const timeMax = new Date(now.getTime() + 20 * 60 * 1000);

      for (const [, { botSettings, subscriptions: userSubs }] of grouped) {
        try {
          let userSessionsCreated = 0;

          for (const subscription of userSubs) {
            const backfillResult =
              await BotBackfillService.backfillSubscription(subscription, {
                timeMin,
                timeMax,
              });

            if (backfillResult.isOk()) {
              userSessionsCreated += backfillResult.value.sessionsCreated;
            } else {
              logger.error("Failed to process subscription", {
                component: "BotCalendarMonitorService.monitorCalendars",
                userId: botSettings.userId,
                subscriptionId: subscription.id,
                error: backfillResult.error.message,
              });
            }
          }

          results.usersProcessed++;
          results.sessionsCreated += userSessionsCreated;
        } catch (error) {
          logger.error("Error processing user subscriptions", {
            component: "BotCalendarMonitorService.monitorCalendars",
            userId: botSettings.userId,
            error: serializeError(error),
          });

          results.errors.push({
            userId: botSettings.userId,
            error:
              error instanceof Error ? error.message : "Unknown error occurred",
          });
        }
      }

      logger.info("Calendar monitoring workflow completed", {
        component: "BotCalendarMonitorService.monitorCalendars",
        results,
      });

      return ok(results);
    } catch (error) {
      logger.error("Failed to monitor calendars", {
        component: "BotCalendarMonitorService.monitorCalendars",
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to monitor calendars",
          error as Error,
          "BotCalendarMonitorService.monitorCalendars",
        ),
      );
    }
  }
}
