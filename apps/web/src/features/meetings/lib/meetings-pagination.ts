import type { MeetingWithSession } from "./calendar-utils";
import {
  filterMeetingsByBotStatus,
  sortMeetingsChronologically,
  type MeetingBotStatusFilter,
} from "./calendar-utils";

export interface PaginatedMeetingsResult {
  meetings: MeetingWithSession[];
  total: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Paginate meetings with filtering and sorting
 */
export function paginateMeetings(
  meetings: MeetingWithSession[],
  options?: {
    page?: number;
    pageSize?: number;
    botStatus?: MeetingBotStatusFilter;
  }
): PaginatedMeetingsResult {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const botStatus = options?.botStatus ?? "all";

  // Filter by bot status
  const filtered = filterMeetingsByBotStatus(meetings, botStatus);

  // Sort chronologically (upcoming first)
  const sorted = sortMeetingsChronologically(filtered);

  // Calculate pagination
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
