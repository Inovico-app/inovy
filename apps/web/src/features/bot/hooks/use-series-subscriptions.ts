"use client";

// NOTE: Per project guidelines, prefer fetching subscriptions in a Server
// Component with 'use cache' and passing them as props to client components.
// This hook is provided as a fallback for cases where server component
// data fetching is not practical (e.g., after a subscribe/unsubscribe
// mutation that needs to refetch). Use getSeriesSubscriptionsAction
// directly from a server component where possible.

import { useCallback, useEffect, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import type { BotSeriesSubscription } from "@/server/db/schema/bot-series-subscriptions";
import { getSeriesSubscriptionsAction } from "../actions/get-series-subscriptions";

export function useSeriesSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<BotSeriesSubscription[]>(
    [],
  );

  const { execute, isExecuting } = useAction(getSeriesSubscriptionsAction, {
    onSuccess: ({ data }) => {
      if (data) setSubscriptions(data);
    },
  });

  useEffect(() => {
    execute();
  }, [execute]);

  const refetch = useCallback(() => execute(), [execute]);

  return { subscriptions, isLoading: isExecuting, refetch };
}
