"use client";

import { format, formatDistanceToNow } from "date-fns";
import { CalendarIcon, ClockIcon, UsersIcon } from "lucide-react";
import { BotStatusBadge } from "@/features/bot/components/bot-status-badge";
import type { MeetingWithSession } from "@/features/meetings/lib/calendar-utils";
import {
  formatTimeRange,
  formatMeetingDuration,
  formatAttendeesCount,
  getMeetingBotStatus,
} from "@/features/meetings/lib/calendar-utils";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MeetingsListItemProps {
  meeting: MeetingWithSession;
}

export function MeetingsListItem({ meeting }: MeetingsListItemProps) {
  const botStatus = getMeetingBotStatus(meeting, meeting.botSession);
  const isPast = meeting.end < new Date();
  const isUpcoming = meeting.start > new Date();

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        isPast && "opacity-75"
      )}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 space-y-2">
            {/* Title */}
            <div className="flex items-start gap-2">
              <h3 className="font-semibold text-base leading-tight">
                {meeting.title || "Untitled Meeting"}
              </h3>
            </div>

            {/* Date and Time */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {format(meeting.start, "MMM d, yyyy")}
                  {isUpcoming && (
                    <span className="ml-1">
                      ({formatDistanceToNow(meeting.start, { addSuffix: true })})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4" />
                <span>
                  {formatTimeRange(meeting.start, meeting.end)} •{" "}
                  {formatMeetingDuration(meeting.start, meeting.end)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <UsersIcon className="h-4 w-4" />
                <span>{formatAttendeesCount(meeting)}</span>
              </div>
            </div>
          </div>

          {/* Bot Status Badge */}
          <div className="flex items-start sm:items-center">
            {botStatus === "no_bot" ? (
              <span className="text-xs text-muted-foreground">No bot</span>
            ) : (
              <BotStatusBadge status={botStatus} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
