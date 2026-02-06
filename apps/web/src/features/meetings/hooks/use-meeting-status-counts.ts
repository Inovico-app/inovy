import { useMemo } from "react";
import type { MeetingWithSession, MeetingBotStatus } from "../lib/calendar-utils";
import { getMeetingBotStatus } from "../lib/calendar-utils";

interface UseMeetingStatusCountsOptions {
  meetings: MeetingWithSession[];
}

export function useMeetingStatusCounts({
  meetings,
}: UseMeetingStatusCountsOptions): Record<MeetingBotStatus | "all", number> {
  return useMemo(() => {
    const counts: Record<MeetingBotStatus | "all", number> = {
      all: 0,
      scheduled: 0,
      joining: 0,
      active: 0,
      leaving: 0,
      completed: 0,
      failed: 0,
      pending_consent: 0,
      no_bot: 0,
    };

    for (const meeting of meetings) {
      const status = getMeetingBotStatus(meeting, meeting.botSession);
      if (status in counts) {
        counts[status]++;
      }
    }

    counts.all = meetings.length;

    return counts;
  }, [meetings]);
}
