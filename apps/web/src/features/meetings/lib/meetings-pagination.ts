import type { MeetingWithSession } from "./calendar-utils";
import {
  filterMeetingsByBotStatus,
  sortMeetingsChronologically,
  sortMeetingsReverseChronologically,
  type MeetingBotStatusFilter,
  type TimePeriod,
} from "./calendar-utils";

export interface PaginatedMeetingsResult {
  meetings: MeetingWithSession[];
  total: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 20;

function sortByTimePeriod(
  meetings: MeetingWithSession[],
  timePeriod?: TimePeriod
): MeetingWithSession[] {
  if (timePeriod === "past") {
    return sortMeetingsReverseChronologically(meetings);
  }
  return sortMeetingsChronologically(meetings);
}

/**
 * Paginate pre-filtered meetings (sort and slice only, no filtering).
 * Use when meetings are already filtered (e.g. by filterMeetingsByBotStatus).
 */
export function paginateMeetingsOnly(
  meetings: MeetingWithSession[],
  options?: { page?: number; pageSize?: number; timePeriod?: TimePeriod }
): PaginatedMeetingsResult {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const sorted = sortByTimePeriod(meetings, options?.timePeriod);
  const total = sorted.length;
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;
  const paginatedMeetings = sorted.slice(offset, offset + pageSize);
  const hasMore = offset + pageSize < total;

  return {
    meetings: paginatedMeetings,
    total,
    hasMore,
    currentPage: page,
    totalPages,
  };
}

/**
 * Return the first `limit` items from pre-filtered meetings (for "load more" mode).
 */
export function loadMoreMeetings(
  meetings: MeetingWithSession[],
  options?: { limit?: number; timePeriod?: TimePeriod }
): PaginatedMeetingsResult {
  const limit = options?.limit ?? DEFAULT_PAGE_SIZE;
  const sorted = sortByTimePeriod(meetings, options?.timePeriod);
  const total = sorted.length;
  const visible = sorted.slice(0, limit);
  const hasMore = limit < total;

  return {
    meetings: visible,
    total,
    hasMore,
    currentPage: 1,
    totalPages: Math.ceil(total / (limit || DEFAULT_PAGE_SIZE)),
  };
}

/**
 * Paginate meetings with filtering and sorting
 */
export function paginateMeetings(
  meetings: MeetingWithSession[],
  options?: {
    page?: number;
    pageSize?: number;
    botStatus?: MeetingBotStatusFilter;
    timePeriod?: TimePeriod;
  }
): PaginatedMeetingsResult {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const botStatus = options?.botStatus ?? "all";

  const filtered = filterMeetingsByBotStatus(meetings, botStatus);
  const sorted = sortByTimePeriod(filtered, options?.timePeriod);

  const total = sorted.length;
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;
  const paginatedMeetings = sorted.slice(offset, offset + pageSize);
  const hasMore = offset + pageSize < total;

  return {
    meetings: paginatedMeetings,
    total,
    hasMore,
    currentPage: page,
    totalPages,
  };
}

