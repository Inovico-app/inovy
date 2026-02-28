"use client";

import type { MeetingWithSession } from "@/features/meetings/lib/calendar-utils";
import { MeetingsEmpty } from "./meetings-empty";
import { MeetingsListItem } from "./meetings-list-item";
import { MeetingsPagination } from "./meetings-pagination";

interface MeetingsListProps {
  meetings: MeetingWithSession[];
  total: number;
  hasMore: boolean;
  allMeetingsCount: number;
  isFiltered: boolean;
  onLoadMore: () => void;
  isLoading?: boolean;
  onClearFilters?: () => void;
  onMeetingClick?: (meeting: MeetingWithSession) => void;
}

export function MeetingsList({
  meetings,
  total,
  hasMore,
  allMeetingsCount,
  isFiltered,
  onLoadMore,
  isLoading,
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
        <MeetingsEmpty variant="no-results" onClearFilters={onClearFilters} />
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
            variant="load-more"
            visibleCount={meetings.length}
            total={total}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  );
}

