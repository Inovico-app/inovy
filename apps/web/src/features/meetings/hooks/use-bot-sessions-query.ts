"use client";

import { useQuery } from "@tanstack/react-query";
import { getBotSessions } from "../actions/get-bot-sessions";
import type { BotSession } from "@/server/db/schema/bot-sessions";

interface UseBotSessionsQueryOptions {
  calendarEventIds: string[];
  enabled?: boolean;
}

/**
 * React Query hook for fetching bot sessions for calendar events
 */
export function useBotSessionsQuery({
  calendarEventIds,
  enabled = true,
}: UseBotSessionsQueryOptions) {
  return useQuery({
    queryKey: ["bot-sessions", [...(calendarEventIds || [])].sort().join(",")],
    queryFn: async () => {
      if (calendarEventIds.length === 0) {
        return {} as Record<string, BotSession>;
      }

      const result = await getBotSessions({
        calendarEventIds,
      });

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (!result?.data) {
        return {} as Record<string, BotSession>;
      }

      return result.data as Record<string, BotSession>;
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    enabled: enabled && calendarEventIds.length > 0,
  });
}
