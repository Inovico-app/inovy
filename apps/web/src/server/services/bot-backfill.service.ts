// src/server/services/bot-backfill.service.ts
import { err, ok } from "neverthrow";
import { logger, serializeError } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import type { BotSeriesSubscription } from "@/server/db/schema/bot-series-subscriptions";
import { BotSeriesSubscriptionsQueries } from "@/server/data-access/bot-series-subscriptions.queries";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { ProjectQueries } from "@/server/data-access/projects.queries";
import { BotProviderFactory } from "@/server/services/bot-providers/factory";
import {
  getCalendarProvider,
  getMeetingLinkProvider,
  type ProviderType,
} from "@/server/services/calendar/calendar-provider-factory";
import { MeetingService } from "@/server/services/meeting.service";

interface BackfillResult {
  sessionsCreated: number;
  errors: Array<{ instanceId: string; error: string }>;
}

export class BotBackfillService {
  /**
   * Backfill bot sessions for a single subscription within a time range.
   */
  static async backfillSubscription(
    subscription: BotSeriesSubscription & {
      botDisplayName: string;
      botJoinMessage: string | null;
    },
    timeRange: { timeMin: Date; timeMax: Date },
  ): Promise<ActionResult<BackfillResult>> {
    const result: BackfillResult = { sessionsCreated: 0, errors: [] };

    try {
      const providerType = subscription.calendarProvider as ProviderType;

      const calendarResult = await getCalendarProvider(
        subscription.userId,
        providerType,
      );
      if (calendarResult.isErr()) {
        return err(calendarResult.error);
      }

      const meetingLinkResult = await getMeetingLinkProvider(
        subscription.userId,
        providerType,
      );
      if (meetingLinkResult.isErr()) {
        return err(meetingLinkResult.error);
      }

      const { provider: calendarProvider } = calendarResult.value;
      const { provider: meetingLinkProvider } = meetingLinkResult.value;

      // Fetch all instances of this series in the time range
      const instancesResult = await calendarProvider.getSeriesInstances(
        subscription.userId,
        subscription.recurringSeriesId,
        {
          timeMin: timeRange.timeMin,
          timeMax: timeRange.timeMax,
          calendarId: subscription.calendarId,
        },
      );

      if (instancesResult.isErr()) {
        return err(instancesResult.error);
      }

      const instances = instancesResult.value;

      if (instances.length === 0) {
        return ok(result);
      }

      // Refresh denormalized seriesTitle if it changed
      const firstInstance = instances[0];
      if (
        firstInstance?.title &&
        firstInstance.title !== subscription.seriesTitle
      ) {
        await BotSeriesSubscriptionsQueries.update(subscription.id, {
          seriesTitle: firstInstance.title,
        });
      }

      // Batch dedup by calendarEventId
      const instanceIds = instances.map((i) => i.id);
      const existingSessions = await BotSessionsQueries.findByCalendarEventIds(
        instanceIds,
        subscription.organizationId,
      );

      // Dedup by meetingUrl
      const instanceUrls = instances
        .map((i) => {
          const url = meetingLinkProvider.extractMeetingUrl(i);
          return url;
        })
        .filter(Boolean) as string[];
      const existingUrls = await BotSessionsQueries.findByMeetingUrls(
        instanceUrls,
        subscription.organizationId,
      );

      // Find project for this org
      const project = await ProjectQueries.findFirstActiveByOrganization(
        subscription.organizationId,
      );
      if (!project) {
        return err(
          ActionErrors.notFound(
            "No active project found",
            "BotBackfillService.backfillSubscription",
          ),
        );
      }

      const botProvider = BotProviderFactory.getDefault();

      for (const instance of instances) {
        try {
          // Skip if already has a session
          if (existingSessions.has(instance.id)) continue;

          const meetingUrl = meetingLinkProvider.extractMeetingUrl(instance);
          if (!meetingUrl) continue;
          if (existingUrls.has(meetingUrl)) continue;

          if (!instance.start) continue;

          const joinAt = new Date(instance.start.getTime() - 15 * 1000);

          // Create bot session via provider
          const sessionResult = await botProvider.createSession({
            meetingUrl,
            joinAt,
            customMetadata: {
              projectId: project.id,
              organizationId: subscription.organizationId,
              userId: subscription.userId,
              calendarEventId: instance.id,
              provider: providerType,
            },
            botDisplayName: subscription.botDisplayName,
            botJoinMessage: subscription.botJoinMessage,
          });

          if (sessionResult.isErr()) {
            result.errors.push({
              instanceId: instance.id,
              error: sessionResult.error.message,
            });
            continue;
          }

          const { providerId } = sessionResult.value;

          // Persist bot session
          const session = await BotSessionsQueries.insert({
            projectId: project.id,
            organizationId: subscription.organizationId,
            userId: subscription.userId,
            recallBotId: providerId,
            recallStatus: sessionResult.value.status,
            meetingUrl,
            meetingTitle: instance.title,
            calendarEventId: instance.id,
            botStatus: "scheduled",
            subscriptionId: subscription.id,
            meetingParticipants:
              instance.attendees?.map((a) => a.email).filter(Boolean) ??
              undefined,
          });

          // Create meeting record
          const meetingResult =
            await MeetingService.findOrCreateForCalendarEvent(
              instance.id,
              subscription.organizationId,
              {
                organizationId: subscription.organizationId,
                projectId: project.id,
                createdById: subscription.userId,
                calendarEventId: instance.id,
                externalCalendarId: instance.id,
                title: instance.title || "Untitled Meeting",
                description: null,
                scheduledStartAt: instance.start ?? new Date(),
                scheduledEndAt: instance.end ?? undefined,
                status: "scheduled",
                meetingUrl,
                participants:
                  instance.attendees?.map((a) => ({
                    email: a.email,
                    name: null,
                    role: null,
                  })) ?? [],
              },
            );

          if (meetingResult.isOk()) {
            await BotSessionsQueries.update(
              session.id,
              subscription.organizationId,
              { meetingId: meetingResult.value.id },
            );
          }

          result.sessionsCreated++;
          // Mark URL as used for subsequent dedup within this batch
          existingUrls.add(meetingUrl);

          logger.info("Created bot session for series instance", {
            component: "BotBackfillService",
            subscriptionId: subscription.id,
            calendarEventId: instance.id,
            botId: providerId,
          });
        } catch (error) {
          result.errors.push({
            instanceId: instance.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return ok(result);
    } catch (error) {
      logger.error("Failed to backfill subscription", {
        component: "BotBackfillService",
        subscriptionId: subscription.id,
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to backfill subscription",
          error as Error,
          "BotBackfillService.backfillSubscription",
        ),
      );
    }
  }
}
