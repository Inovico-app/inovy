import { isSameDay, startOfDay, endOfDay, differenceInMinutes } from "date-fns";
import type { MeetingWithSession } from "./calendar-utils";

/** Height of one hour in the time grid (px). 60px = 1px per minute. */
export const HOUR_HEIGHT = 60;

/** Array of hours 0–23 for rendering the time gutter. */
export const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** Total height of a full day column in px. */
export const DAY_HEIGHT = HOUR_HEIGHT * 24;

/**
 * Get the number of minutes since midnight for a given date.
 */
export function getMinutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Get the top offset in px for a given time within the day grid.
 */
export function getTopOffset(
  date: Date,
  hourHeight: number = HOUR_HEIGHT,
): number {
  return (getMinutesSinceMidnight(date) / 60) * hourHeight;
}

/**
 * Get the height in px for an event based on its duration.
 * Enforces a minimum height for very short events.
 */
export function getEventHeight(
  start: Date,
  end: Date,
  hourHeight: number = HOUR_HEIGHT,
): number {
  const minutes = differenceInMinutes(end, start);
  const height = (minutes / 60) * hourHeight;
  return Math.max(height, 20); // min 20px for readability
}

/**
 * Format an hour number (0-23) to a display label.
 * e.g. 0 → "12 AM", 9 → "9 AM", 13 → "1 PM"
 */
export function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

/**
 * Check if a meeting spans multiple days (crosses midnight).
 */
export function isMultiDayMeeting(meeting: MeetingWithSession): boolean {
  return !isSameDay(meeting.start, meeting.end);
}

/**
 * Split meetings into timed (single-day) and all-day/multi-day events.
 */
export function splitMeetingsByType(
  meetings: MeetingWithSession[],
  _dates: Date[],
): {
  timedMeetings: MeetingWithSession[];
  allDayMeetings: MeetingWithSession[];
} {
  const timedMeetings: MeetingWithSession[] = [];
  const allDayMeetings: MeetingWithSession[] = [];

  for (const meeting of meetings) {
    if (isMultiDayMeeting(meeting)) {
      allDayMeetings.push(meeting);
    } else {
      timedMeetings.push(meeting);
    }
  }

  return { timedMeetings, allDayMeetings };
}

/**
 * Get meetings that occur on a specific date.
 */
export function getMeetingsForDate(
  meetings: MeetingWithSession[],
  date: Date,
): MeetingWithSession[] {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  return meetings.filter((m) => {
    // Meeting starts on this day
    if (isSameDay(m.start, date)) return true;
    // Meeting spans this day (started before, ends after)
    if (m.start < dayStart && m.end > dayEnd) return true;
    // Meeting ends on this day (started on a previous day)
    if (m.end > dayStart && m.end <= dayEnd && m.start < dayStart) return true;
    return false;
  });
}

/**
 * Layout information for an event in the overlap grid.
 */
export interface EventLayout {
  meeting: MeetingWithSession;
  top: number;
  height: number;
  column: number;
  totalColumns: number;
}

/**
 * Compute overlap layout for a list of timed meetings on a single day.
 * Uses a greedy column assignment algorithm.
 */
export function computeOverlapLayout(
  meetings: MeetingWithSession[],
  hourHeight: number = HOUR_HEIGHT,
): EventLayout[] {
  if (meetings.length === 0) return [];

  // Sort by start time, then by duration (longest first for stable layout)
  const sorted = [...meetings].sort((a, b) => {
    const startDiff = a.start.getTime() - b.start.getTime();
    if (startDiff !== 0) return startDiff;
    return (
      differenceInMinutes(b.end, b.start) - differenceInMinutes(a.end, a.start)
    );
  });

  // Assign columns using a greedy approach
  const columns: Date[][] = []; // columns[colIndex] = array of event end times
  const assignments: Array<{ meeting: MeetingWithSession; column: number }> =
    [];

  for (const meeting of sorted) {
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      // Check if this column is free (all events in it have ended before this one starts)
      const lastEnd = columns[col][columns[col].length - 1];
      if (lastEnd <= meeting.start) {
        columns[col].push(meeting.end);
        assignments.push({ meeting, column: col });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([meeting.end]);
      assignments.push({ meeting, column: columns.length - 1 });
    }
  }

  // Group events into collision clusters to determine totalColumns per cluster
  const layouts: EventLayout[] = [];

  // Build adjacency: events that overlap share a cluster
  const clusterIds = new Array<number>(sorted.length).fill(-1);
  let nextCluster = 0;

  for (let i = 0; i < sorted.length; i++) {
    if (clusterIds[i] === -1) {
      clusterIds[i] = nextCluster++;
    }
    for (let j = i + 1; j < sorted.length; j++) {
      // Check if events i and j overlap
      if (sorted[j].start < sorted[i].end) {
        clusterIds[j] = clusterIds[i];
      }
    }
  }

  // Count max columns per cluster
  const clusterMaxCol = new Map<number, number>();
  for (let i = 0; i < assignments.length; i++) {
    const clusterId = clusterIds[i];
    const col = assignments[i].column;
    clusterMaxCol.set(
      clusterId,
      Math.max(clusterMaxCol.get(clusterId) ?? 0, col + 1),
    );
  }

  for (let i = 0; i < assignments.length; i++) {
    const { meeting, column } = assignments[i];
    const clusterId = clusterIds[i];
    const totalColumns = clusterMaxCol.get(clusterId) ?? 1;

    layouts.push({
      meeting,
      top: getTopOffset(meeting.start, hourHeight),
      height: getEventHeight(meeting.start, meeting.end, hourHeight),
      column,
      totalColumns,
    });
  }

  return layouts;
}
