"use client";

import type { MeetingWithSession } from "@/features/meetings/lib/calendar-utils";
import { MeetingsListItem } from "./meetings-list-item";
import { MeetingsPagination } from "./meetings-pagination";
import { MeetingsEmpty } from "./meetings-empty";

interface MeetingsListProps {
  meetings: MeetingWithSession[];
  currentPage: number;
  totalPages: number;
  total: number;
  allMeetingsCount: number;
  isFiltered: boolean;
  onPageChange: (page: number) => void;
  onClearFilters?: () => void;
  onMeetingClick?: (meeting: MeetingWithSession) => void;
}

export function MeetingsList({
  meetings,
  currentPage,
  totalPages,
  total,
  allMeetingsCount,
  isFiltered,
  onPageChange,
  onClearFilters,
  onMeetingClick,
}: MeetingsListProps) {
  const hasAnyMeetings = allMeetingsCount > 0;
  const hasFilteredMeetings = total > 0;

  return (
    <div className="space-y-4">
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
              <MeetingsListItem
                key={meeting.id}
                meeting={meeting}
                onMeetingClick={onMeetingClick}
              />
            ))}
          </div>

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
