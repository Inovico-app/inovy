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
// Shared helper for fetching meetings
async function fetchMeetingsForRange(timeMin: Date, timeMax: Date): Promise<CalendarEvent[]> {
  const result = await getMeetings({ timeMin, timeMax });

  if (result?.serverError) {
    throw new Error(result.serverError);
  }

  if (!result?.data) {
    return [];
  }

  return result.data as CalendarEvent[];
}

export function useMeetingsQuery({ month, enabled = true }: UseMeetingsQueryOptions) {
  const queryClient = useQueryClient();
  const monthStart = startOfMonth(month);
  const { start, end } = getPaddedMonthRange(monthStart, 2);
  
  // Use stable primitive for month key
  const monthKey = monthStart.getTime();

  const query = useQuery({
    queryKey: ["meetings", monthKey],
    queryFn: () => fetchMeetingsForRange(start, end),
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
    const nextMonthKey = startOfMonth(nextMonth).getTime();
    
    queryClient.prefetchQuery({
      queryKey: ["meetings", nextMonthKey],
      queryFn: () => fetchMeetingsForRange(nextMonthRange.start, nextMonthRange.end),
      staleTime: 5 * 60 * 1000,
    });

    // Prefetch previous month
    const prevMonth = addMonths(monthStart, -1);
    const prevMonthRange = getPaddedMonthRange(prevMonth, 2);
    const prevMonthKey = startOfMonth(prevMonth).getTime();
    
    queryClient.prefetchQuery({
      queryKey: ["meetings", prevMonthKey],
      queryFn: () => fetchMeetingsForRange(prevMonthRange.start, prevMonthRange.end),
      staleTime: 5 * 60 * 1000,
    });
  }, [query.isSuccess, monthKey, queryClient, enabled, monthStart]);

  return query;
}
