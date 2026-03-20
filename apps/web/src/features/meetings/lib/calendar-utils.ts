import type { BotSession, BotStatus } from "@/server/db/schema/bot-sessions";
import type { CalendarEvent } from "@/server/services/calendar/types";
import type { ProviderType } from "@/server/services/calendar/calendar-provider-factory";
import {
  addDays,
  addMonths,
  differenceInMinutes,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isSameYear,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
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
  calendarProvider?: ProviderType;
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
 * Get padded month range (current month ± 2 months)
 * This allows instant month switching without refetching data
 * @param date - The current month date
 * @param paddingMonths - Number of months to pad on each side (default: 2)
 */
export function getPaddedMonthRange(
  date: Date,
  paddingMonths: number = 2,
): { start: Date; end: Date } {
  const paddedStart = subMonths(startOfMonth(date), paddingMonths);
  const paddedEnd = endOfMonth(addMonths(date, paddingMonths));
  return {
    start: paddedStart,
    end: paddedEnd,
  };
}

/**
 * Generate array of days for calendar grid
 * Includes days from previous/next month to fill the grid
 * @param year - Year (e.g., 2026)
 * @param month - 0-indexed month (0 = January, 11 = December)
 * @param weekStartsOn - Day of week to start the week (0 = Sunday, 6 = Saturday)
 */
export function getCalendarDays(
  year: number,
  month: number,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0,
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
  meetings: CalendarEvent[],
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
  sessions: Map<string, BotSession>,
  calendarProvider?: ProviderType,
): MeetingWithSession[] {
  return meetings.map((meeting) => {
    const session = sessions.get(meeting.id);
    return {
      ...meeting,
      botSession: session,
      calendarProvider,
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

/**
 * Format month date range for display (e.g., "Feb 1 – Feb 28, 2026")
 */
export function formatDateRange(date: Date): string {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  return `${format(monthStart, "MMM d")} – ${format(monthEnd, "MMM d, yyyy")}`;
}

/**
 * Calculate meeting duration in minutes
 */
export function getMeetingDuration(start: Date, end: Date): number {
  return differenceInMinutes(end, start);
}

/**
 * Format meeting duration for display (e.g., "30 min", "1.5 hours")
 */
export function formatMeetingDuration(start: Date, end: Date): string {
  const minutes = getMeetingDuration(start, end);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = minutes / 60;
  if (hours % 1 === 0) {
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  return `${hours.toFixed(1)} hours`;
}

/**
 * Get attendees count from meeting
 */
export function getAttendeesCount(meeting: CalendarEvent): number {
  return meeting.attendees?.length ?? 0;
}

/**
 * Format attendees count for display
 */
export function formatAttendeesCount(meeting: CalendarEvent): string {
  const count = getAttendeesCount(meeting);
  if (count === 0) {
    return "No attendees";
  }
  return `${count} ${count === 1 ? "attendee" : "attendees"}`;
}

/**
 * Determine bot status for a meeting (including "no_bot")
 */
export type MeetingBotStatus = BotStatus | "no_bot";

/**
 * Filter options for meetings (All, With Bot, Without Bot, Active, Failed)
 */
export type MeetingBotStatusFilter =
  | "all"
  | "with_bot"
  | "without_bot"
  | "active"
  | "failed";

/**
 * Statuses that count as "with bot" (has bot session)
 * Shared by filterMeetingsByBotStatus and useMeetingStatusCounts
 */
export const WITH_BOT_STATUSES: MeetingBotStatus[] = [
  "scheduled",
  "joining",
  "active",
  "leaving",
  "completed",
];

/**
 * Valid filter values for URL/state
 */
const VALID_BOT_STATUS_FILTERS: MeetingBotStatusFilter[] = [
  "all",
  "with_bot",
  "without_bot",
  "active",
  "failed",
];

/**
 * Validate and normalize bot status filter parameter
 */
export function validateBotStatus(
  status: string | undefined,
): MeetingBotStatusFilter {
  if (!status) {
    return "all";
  }
  return VALID_BOT_STATUS_FILTERS.includes(status as MeetingBotStatusFilter)
    ? (status as MeetingBotStatusFilter)
    : "all";
}

export function getMeetingBotStatus(
  meeting: CalendarEvent,
  botSession?: BotSession,
): MeetingBotStatus {
  if (!botSession) {
    return "no_bot";
  }

  // If the meeting hasn't started yet and bot status is "joining",
  // show "scheduled" instead to avoid confusion
  const now = new Date();
  const meetingHasStarted = meeting.start <= now;

  if (!meetingHasStarted && botSession.botStatus === "joining") {
    return "scheduled";
  }

  return botSession.botStatus;
}

function assertUnreachable(value: never): never {
  throw new Error(`Unhandled MeetingBotStatusFilter: ${String(value)}`);
}

/**
 * Check if meeting matches the given filter
 */
function meetingMatchesFilter(
  meeting: MeetingWithSession,
  filter: MeetingBotStatusFilter,
): boolean {
  const status = getMeetingBotStatus(meeting, meeting.botSession);

  switch (filter) {
    case "all":
      return true;
    case "with_bot":
      return WITH_BOT_STATUSES.includes(status);
    case "without_bot":
      return status === "no_bot";
    case "active":
      return status === "active";
    case "failed":
      return status === "failed";
    default:
      return assertUnreachable(filter);
  }
}

/**
 * Filter meetings by bot status
 */
export function filterMeetingsByBotStatus(
  meetings: MeetingWithSession[],
  status: MeetingBotStatusFilter,
): MeetingWithSession[] {
  if (status === "all") {
    return meetings;
  }
  return meetings.filter((meeting) => meetingMatchesFilter(meeting, status));
}

/**
 * Sort meetings chronologically (earliest first)
 */
export function sortMeetingsChronologically(
  meetings: MeetingWithSession[],
): MeetingWithSession[] {
  return [...meetings].sort((a, b) => {
    return a.start.getTime() - b.start.getTime();
  });
}

/**
 * Sort meetings reverse chronologically (most recent first)
 */
export function sortMeetingsReverseChronologically(
  meetings: MeetingWithSession[],
): MeetingWithSession[] {
  return [...meetings].sort((a, b) => {
    return b.start.getTime() - a.start.getTime();
  });
}

/**
 * Calendar view types
 */
export type CalendarView = "day" | "work-week" | "week" | "month" | "list";

/**
 * Get start and end of a single day
 */
export function getDayRange(date: Date): { start: Date; end: Date } {
  return { start: startOfDay(date), end: endOfDay(date) };
}

/**
 * Get start and end of a week (Sunday–Saturday)
 */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 0 }),
    end: endOfWeek(date, { weekStartsOn: 0 }),
  };
}

/**
 * Get start and end of a work week (Monday–Friday)
 */
export function getWorkWeekRange(date: Date): { start: Date; end: Date } {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  const friday = endOfDay(addDays(monday, 4));
  return { start: monday, end: friday };
}

/**
 * Get the visible date range for a given calendar view
 */
export function getVisibleRange(
  date: Date,
  view: CalendarView,
): { start: Date; end: Date } {
  switch (view) {
    case "day":
      return getDayRange(date);
    case "week":
      return getWeekRange(date);
    case "work-week":
      return getWorkWeekRange(date);
    case "month":
    case "list":
      return getMonthRange(date);
  }
}

/**
 * Get the array of dates to display in a time-grid view
 */
export function getVisibleDates(date: Date, view: CalendarView): Date[] {
  switch (view) {
    case "day":
      return [startOfDay(date)];
    case "week":
      return eachDayOfInterval(getWeekRange(date));
    case "work-week":
      return eachDayOfInterval(getWorkWeekRange(date));
    default:
      return [];
  }
}

/**
 * Format week range for display (e.g., "Mar 15 – 21, 2026" or "Dec 29, 2025 – Jan 4, 2026")
 */
export function formatWeekRange(date: Date): string {
  const { start, end } = getWeekRange(date);
  if (isSameMonth(start, end)) {
    return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
  }
  if (isSameYear(start, end)) {
    return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

/**
 * Format work week range for display
 */
export function formatWorkWeekRange(date: Date): string {
  const { start, end } = getWorkWeekRange(date);
  if (isSameMonth(start, end)) {
    return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
  }
  if (isSameYear(start, end)) {
    return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

export type TimePeriod = "upcoming" | "past";

/**
 * Filter meetings by time period relative to now
 */
export function filterMeetingsByTimePeriod(
  meetings: MeetingWithSession[],
  timePeriod: TimePeriod,
): MeetingWithSession[] {
  const now = new Date();
  switch (timePeriod) {
    case "upcoming":
      return meetings.filter((m) => m.start >= now);
    case "past":
      return meetings.filter((m) => m.start < now);
    default: {
      const _exhaustive: never = timePeriod;
      throw new Error(`Unhandled TimePeriod: ${String(_exhaustive)}`);
    }
  }
}
