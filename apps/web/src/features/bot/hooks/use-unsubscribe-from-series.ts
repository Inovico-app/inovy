"use client";

import { useAction } from "next-safe-action/hooks";
import { unsubscribeFromSeriesAction } from "../actions/unsubscribe-from-series";
import { toast } from "sonner";

export function useUnsubscribeFromSeries() {
  const { execute, isExecuting } = useAction(unsubscribeFromSeriesAction, {
    onSuccess: ({ data }) => {
      toast.success(
        `Unsubscribed. ${data?.cancelledSessions ?? 0} pending sessions cancelled.`,
      );
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to unsubscribe from series");
    },
  });

  return { unsubscribe: execute, isUnsubscribing: isExecuting };
}
