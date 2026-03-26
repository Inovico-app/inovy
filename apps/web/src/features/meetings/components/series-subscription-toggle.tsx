"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAction } from "next-safe-action/hooks";
import { subscribeToSeriesAction } from "@/features/bot/actions/subscribe-to-series";
import { unsubscribeFromSeriesAction } from "@/features/bot/actions/unsubscribe-from-series";
import type { BotSeriesSubscription } from "@/server/db/schema/bot-series-subscriptions";
import type { ProviderType } from "@/server/services/calendar/calendar-provider-factory";
import { Loader2, RefreshCwOff, Repeat2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface SeriesSubscriptionToggleProps {
  calendarEventId: string;
  calendarId: string;
  calendarProvider: ProviderType;
  recurringSeriesId: string;
  subscriptions: BotSeriesSubscription[];
  onSubscriptionChange?: () => void;
}

/**
 * Toggle button for subscribing/unsubscribing from recording all occurrences
 * of a recurring meeting series. Only renders when a recurringSeriesId is present.
 */
export function SeriesSubscriptionToggle({
  calendarEventId,
  calendarId,
  calendarProvider,
  recurringSeriesId,
  subscriptions,
  onSubscriptionChange,
}: SeriesSubscriptionToggleProps) {
  const t = useTranslations("meetings");
  const activeSubscription = subscriptions.find(
    (s) => s.recurringSeriesId === recurringSeriesId && s.active,
  );
  const isSubscribed = !!activeSubscription;

  const { execute: subscribe, isExecuting: isSubscribing } = useAction(
    subscribeToSeriesAction,
    {
      onSuccess: ({ data }) => {
        toast.success(
          t("toast.seriesSubscribed", { count: data?.sessionsCreated ?? 0 }),
        );
        onSubscriptionChange?.();
      },
      onError: ({ error }) => {
        toast.error(error.serverError || t("toast.seriesSubscribeFailed"));
      },
    },
  );

  const { execute: unsubscribe, isExecuting: isUnsubscribing } = useAction(
    unsubscribeFromSeriesAction,
    {
      onSuccess: ({ data }) => {
        toast.success(
          t("toast.seriesUnsubscribed", {
            count: data?.cancelledSessions ?? 0,
          }),
        );
        onSubscriptionChange?.();
      },
      onError: ({ error }) => {
        toast.error(error.serverError || t("toast.seriesUnsubscribeFailed"));
      },
    },
  );

  const isLoading = isSubscribing || isUnsubscribing;

  const handleToggle = () => {
    if (isSubscribed && activeSubscription) {
      unsubscribe({ subscriptionId: activeSubscription.id });
    } else {
      subscribe({ calendarEventId, calendarId, calendarProvider });
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant={isSubscribed ? "secondary" : "outline"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              disabled={isLoading}
              aria-label={
                isSubscribed
                  ? t("bot.stopRecordingSeries")
                  : t("bot.recordAllOccurrences")
              }
              className="shrink-0"
            />
          }
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isSubscribed ? (
            <RefreshCwOff className="h-3.5 w-3.5" />
          ) : (
            <Repeat2 className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5 hidden sm:inline">
            {isSubscribed ? t("bot.stopSeries") : t("bot.recordSeries")}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {isSubscribed
            ? t("bot.stopRecordingSeries")
            : t("bot.recordAllOccurrencesTooltip")}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
