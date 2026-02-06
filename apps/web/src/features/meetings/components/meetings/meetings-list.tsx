"use client";

import type { MeetingWithSession, MeetingBotStatus } from "@/features/meetings/lib/calendar-utils";
import { MeetingsListItem } from "./meetings-list-item";
import { MeetingsFilter } from "./meetings-filter";
import { MeetingsPagination } from "./meetings-pagination";
import { MeetingsEmpty } from "./meetings-empty";
import { useMeetingStatusCounts } from "../../hooks/use-meeting-status-counts";

interface MeetingsListProps {
  meetings: MeetingWithSession[];
  allMeetings?: MeetingWithSession[]; // Full list for status counts
  currentPage: number;
  totalPages: number;
  total: number;
  selectedStatus: MeetingBotStatus | "all";
  onStatusChange: (status: MeetingBotStatus | "all") => void;
  onPageChange: (page: number) => void;
  onClearFilters?: () => void;
}

export function MeetingsList({
  meetings,
  allMeetings,
  currentPage,
  totalPages,
  total,
  selectedStatus,
  onStatusChange,
  onPageChange,
  onClearFilters,
}: MeetingsListProps) {
  const meetingsForCounts = allMeetings ?? meetings;
  const statusCounts = useMeetingStatusCounts({ meetings: meetingsForCounts });

  const hasAnyMeetings = meetingsForCounts.length > 0;
  const hasFilteredMeetings = meetings.length > 0;
  const isFiltered = selectedStatus !== "all";

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center justify-between">
        <MeetingsFilter
          selectedStatus={selectedStatus}
          onStatusChange={onStatusChange}
          statusCounts={statusCounts}
        />
      </div>

      {/* Meetings List */}
      {!hasAnyMeetings ? (
        <MeetingsEmpty variant="no-meetings" />
      ) : !hasFilteredMeetings && isFiltered ? (
        <MeetingsEmpty
          variant="no-results"
          onClearFilters={onClearFilters}
        />
      ) : (
        <>
          <div className="space-y-3">
            {meetings.map((meeting) => (
              <MeetingsListItem key={meeting.id} meeting={meeting} />
            ))}
          </div>

          {/* Pagination */}
          <MeetingsPagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={total}
            onPageChange={onPageChange}
          />
        </>
      )}
    </div>
  );
}
