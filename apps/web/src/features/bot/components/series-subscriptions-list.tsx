"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSeriesSubscriptions } from "@/features/bot/hooks/use-series-subscriptions";
import { useAction } from "next-safe-action/hooks";
import { unsubscribeFromSeriesAction } from "../actions/unsubscribe-from-series";
import { toast } from "sonner";
import { CalendarDays, Loader2, RefreshCw, Repeat2 } from "lucide-react";
import { useState } from "react";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google Calendar",
  microsoft: "Microsoft Calendar",
};

/**
 * Subscription management section for the bot settings page.
 * Lists all active series subscriptions with an unsubscribe option.
 */
export function SeriesSubscriptionsList() {
  const { subscriptions, isLoading, refetch } = useSeriesSubscriptions();
  const [unsubscribingId, setUnsubscribingId] = useState<string | null>(null);

  const { execute: unsubscribe } = useAction(unsubscribeFromSeriesAction, {
    onSuccess: ({ data }) => {
      setUnsubscribingId(null);
      toast.success(
        `Unsubscribed. ${data?.cancelledSessions ?? 0} pending sessions cancelled.`,
      );
      refetch();
    },
    onError: ({ error }) => {
      setUnsubscribingId(null);
      toast.error(error.serverError || "Failed to unsubscribe from series");
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Repeat2 className="h-5 w-5" />
              Recording Subscriptions
            </CardTitle>
            <CardDescription>
              Recurring meeting series with automatic recording enabled
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            aria-label="Refresh subscriptions"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">No active subscriptions</p>
              <p className="text-xs text-muted-foreground mt-1">
                Subscribe to recurring series from the meetings page to
                automatically record all occurrences.
              </p>
            </div>
          </div>
        ) : (
          <ul
            className="divide-y"
            role="list"
            aria-label="Active subscriptions"
          >
            {subscriptions.map((subscription) => (
              <li
                key={subscription.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium">
                    {subscription.seriesTitle ?? "Untitled Series"}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {PROVIDER_LABELS[subscription.calendarProvider] ??
                      subscription.calendarProvider}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUnsubscribingId(subscription.id);
                    unsubscribe({ subscriptionId: subscription.id });
                  }}
                  disabled={unsubscribingId === subscription.id}
                  aria-label={`Unsubscribe from ${subscription.seriesTitle ?? "this series"}`}
                  className="shrink-0"
                >
                  {unsubscribingId === subscription.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Unsubscribe"
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
