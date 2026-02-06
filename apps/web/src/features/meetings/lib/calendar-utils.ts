import type { CalendarEvent } from "@/server/services/google-calendar.service";
import type { BotSession } from "@/server/db/schema/bot-sessions";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
} from "date-fns";

/**
 * Calendar utility functions
 * Helper functions for date manipulation and calendar grid generation
 */

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfMonth: number;
}

export interface MeetingWithSession extends CalendarEvent {
  botSession?: BotSession;
}

/**
 * Get start and end dates for a month
 */
export function getMonthRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

/**
 * Generate array of days for calendar grid
 * Includes days from previous/next month to fill the grid
 */
export function getCalendarDays(
  year: number,
  month: number,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0
): CalendarDay[] {
  const monthStart = new Date(year, month, 1);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });

  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  return days.map((date) => ({
    date,
    isCurrentMonth: isSameMonth(date, monthStart),
    isToday: isToday(date),
    dayOfMonth: date.getDate(),
  }));
}

/**
 * Group meetings by date (YYYY-MM-DD key)
 */
export function groupMeetingsByDate(
  meetings: CalendarEvent[]
): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>();

  for (const meeting of meetings) {
    const dateKey = format(meeting.start, "yyyy-MM-dd");
    const existing = grouped.get(dateKey) ?? [];
    existing.push(meeting);
    grouped.set(dateKey, existing);
  }

  return grouped;
}

/**
 * Match meetings with bot sessions by calendarEventId
 */
export function matchMeetingsWithSessions(
  meetings: CalendarEvent[],
  sessions: Map<string, BotSession>
): MeetingWithSession[] {
  return meetings.map((meeting) => {
    const session = sessions.get(meeting.id);
    return {
      ...meeting,
      botSession: session,
    };
  });
}

/**
 * Format time range for display (e.g., "9:00 AM - 10:30 AM")
 */
export function formatTimeRange(start: Date, end: Date): string {
  const startTime = format(start, "h:mm a");
  const endTime = format(end, "h:mm a");
  return `${startTime} - ${endTime}`;
}

/**
 * Format date for calendar cell header
 */
export function formatDayHeader(date: Date): string {
  return format(date, "d");
}

/**
 * Format month/year for display (e.g., "February 2026")
 */
export function formatMonthYear(date: Date): string {
  return format(date, "MMMM yyyy");
}
