import { useMemo } from "react";
import type { MeetingWithSession, MeetingBotStatusFilter } from "../lib/calendar-utils";
import {
  getMeetingBotStatus,
  WITH_BOT_STATUSES,
} from "../lib/calendar-utils";

interface UseMeetingStatusCountsOptions {
  meetings: MeetingWithSession[];
}

export function useMeetingStatusCounts({
  meetings,
}: UseMeetingStatusCountsOptions): Record<MeetingBotStatusFilter, number> {
  return useMemo(() => {
    const counts: Record<MeetingBotStatusFilter, number> = {
      all: meetings.length,
      with_bot: 0,
      without_bot: 0,
      pending_consent: 0,
      active: 0,
      failed: 0,
    };

    for (const meeting of meetings) {
      const status = getMeetingBotStatus(meeting, meeting.botSession);

      if (WITH_BOT_STATUSES.includes(status)) {
        counts.with_bot++;
      }
      if (status === "no_bot") {
        counts.without_bot++;
      } else if (status === "pending_consent") {
        counts.pending_consent++;
      } else if (status === "active") {
        counts.active++;
      } else if (status === "failed") {
        counts.failed++;
      }
    }

    return counts;
  }, [meetings]);
}
