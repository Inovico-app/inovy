"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getMeetings } from "../actions/get-meetings";
import type { CalendarEvent } from "@/server/services/google-calendar.service";
import { getPaddedMonthRange } from "../lib/calendar-utils";
import { startOfMonth, addMonths } from "date-fns";

interface UseMeetingsQueryOptions {
  month: Date;
  enabled?: boolean;
}

/**
 * React Query hook for fetching calendar meetings with automatic prefetching
 * Prefetches adjacent months in the background for instant month switching
 */
export function useMeetingsQuery({ month, enabled = true }: UseMeetingsQueryOptions) {
  const queryClient = useQueryClient();
  const monthStart = startOfMonth(month);
  const { start, end } = getPaddedMonthRange(monthStart, 2);

  const query = useQuery({
    queryKey: ["meetings", monthStart.toISOString()],
    queryFn: async () => {
      const result = await getMeetings({
        timeMin: start,
        timeMax: end,
      });

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (!result?.data) {
        return [] as CalendarEvent[];
      }

      return result.data as CalendarEvent[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled,
  });

  // Prefetch adjacent months in the background when current month data loads
  useEffect(() => {
    if (!query.isSuccess || !enabled) {
      return;
    }

    // Prefetch next month
    const nextMonth = addMonths(monthStart, 1);
    const nextMonthRange = getPaddedMonthRange(nextMonth, 2);
    
    queryClient.prefetchQuery({
      queryKey: ["meetings", nextMonth.toISOString()],
      queryFn: async () => {
        const result = await getMeetings({
          timeMin: nextMonthRange.start,
          timeMax: nextMonthRange.end,
        });
        return result?.data ?? [];
      },
      staleTime: 5 * 60 * 1000,
    });

    // Prefetch previous month
    const prevMonth = addMonths(monthStart, -1);
    const prevMonthRange = getPaddedMonthRange(prevMonth, 2);
    
    queryClient.prefetchQuery({
      queryKey: ["meetings", prevMonth.toISOString()],
      queryFn: async () => {
        const result = await getMeetings({
          timeMin: prevMonthRange.start,
          timeMax: prevMonthRange.end,
        });
        return result?.data ?? [];
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [query.isSuccess, monthStart, queryClient, enabled]);

  return query;
}
