"use client";

// NOTE: Per project guidelines, prefer fetching subscriptions in a Server
// Component with 'use cache' and passing them as props to client components.
// This hook is provided as a fallback for cases where server component
// data fetching is not practical (e.g., after a subscribe/unsubscribe
// mutation that needs to refetch). Use getSeriesSubscriptionsAction
// directly from a server component where possible.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { BotSeriesSubscription } from "@/server/db/schema/bot-series-subscriptions";
import { getSeriesSubscriptionsAction } from "../actions/get-series-subscriptions";

const SERIES_SUBSCRIPTIONS_QUERY_KEY = ["series-subscriptions"] as const;

export function useSeriesSubscriptions() {
  const queryClient = useQueryClient();

  const { data: subscriptions = [], isLoading } = useQuery<
    BotSeriesSubscription[]
  >({
    queryKey: SERIES_SUBSCRIPTIONS_QUERY_KEY,
    queryFn: async () => {
      const result = await getSeriesSubscriptionsAction();
      return result?.data ?? [];
    },
  });

  const refetch = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: SERIES_SUBSCRIPTIONS_QUERY_KEY,
      }),
    [queryClient],
  );

  return { subscriptions, isLoading, refetch };
}
