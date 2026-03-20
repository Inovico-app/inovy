"use server";

import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { subscribeToSeriesSchema } from "@/server/validation/bot/subscribe-to-series.schema";
import { BotSeriesSubscriptionsQueries } from "@/server/data-access/bot-series-subscriptions.queries";
import { BotBackfillService } from "@/server/services/bot-backfill.service";
import { BotSettingsQueries } from "@/server/data-access/bot-settings.queries";
import {
  getCalendarProvider,
  type ProviderType,
} from "@/server/services/calendar/calendar-provider-factory";

export const subscribeToSeriesAction = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:create") })
  .schema(subscribeToSeriesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { calendarEventId, calendarId, calendarProvider } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "subscribe-to-series",
      );
    }

    const userId = user.id;
    const providerType = calendarProvider as ProviderType;

    // Resolve recurringSeriesId from the calendar event
    const calendarResult = await getCalendarProvider(userId, providerType);
    if (calendarResult.isErr()) {
      throw new Error(calendarResult.error.message);
    }

    const { provider } = calendarResult.value;
    const eventResult = await provider.getEvent(
      userId,
      calendarId,
      calendarEventId,
    );
    if (eventResult.isErr()) {
      throw new Error(eventResult.error.message);
    }

    const event = eventResult.value;
    const recurringSeriesId = event.recurringSeriesId;

    if (!recurringSeriesId) {
      throw new Error("This event is not part of a recurring series");
    }

    // Check if already subscribed (scoped to user + org + series)
    const existing = await BotSeriesSubscriptionsQueries.findByUserAndSeriesId(
      userId,
      recurringSeriesId,
      organizationId,
    );

    if (existing && existing.active) {
      throw new Error("Already subscribed to this series");
    }

    // Get bot settings for display name and join message
    const botSettingsRecord = await BotSettingsQueries.findByUserId(
      userId,
      organizationId,
    );

    if (!botSettingsRecord || !botSettingsRecord.botEnabled) {
      throw new Error("Bot must be enabled to subscribe to series");
    }

    // Create or reactivate subscription
    let subscription;
    if (existing && !existing.active) {
      subscription = await BotSeriesSubscriptionsQueries.update(
        existing.id,
        organizationId,
        {
          active: true,
          seriesTitle: event.title,
        },
      );
    } else {
      subscription = await BotSeriesSubscriptionsQueries.insert({
        userId,
        organizationId,
        recurringSeriesId,
        calendarProvider,
        calendarId,
        seriesTitle: event.title,
        active: true,
      });
    }

    if (!subscription) {
      throw new Error("Failed to create subscription");
    }

    // Trigger immediate 30-day backfill
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    const backfillResult = await BotBackfillService.backfillSubscription(
      {
        ...subscription,
        botDisplayName:
          botSettingsRecord.botDisplayName ?? "Inovy Recording Bot",
        botJoinMessage: botSettingsRecord.botJoinMessage ?? null,
      },
      { timeMin: now, timeMax: thirtyDaysFromNow },
    );

    if (backfillResult.isErr()) {
      // Rollback: undo the subscription change
      if (existing && !existing.active) {
        // Was a reactivation — set back to inactive
        await BotSeriesSubscriptionsQueries.update(
          subscription.id,
          organizationId,
          { active: false },
        );
      } else {
        // Was a new insert — deactivate it
        await BotSeriesSubscriptionsQueries.deactivate(
          subscription.id,
          organizationId,
        );
      }
      throw new Error(backfillResult.error.message);
    }

    const sessionsCreated = backfillResult.value.sessionsCreated;

    return {
      subscription,
      sessionsCreated,
    };
  });
