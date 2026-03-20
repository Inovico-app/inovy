"use client";

import { useAction } from "next-safe-action/hooks";
import { subscribeToSeriesAction } from "../actions/subscribe-to-series";
import { toast } from "sonner";

export function useSubscribeToSeries() {
  const { execute, isExecuting } = useAction(subscribeToSeriesAction, {
    onSuccess: ({ data }) => {
      toast.success(
        `Subscribed! ${data?.sessionsCreated ?? 0} recording sessions scheduled.`,
      );
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to subscribe to series");
    },
  });

  return { subscribe: execute, isSubscribing: isExecuting };
}
