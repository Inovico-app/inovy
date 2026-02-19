"use client";

import { format, formatDistanceToNow } from "date-fns";
import { CalendarIcon, ClockIcon, FileVideoIcon, UsersIcon } from "lucide-react";
import { BotSessionStatusTrigger } from "@/features/bot/components/bot-session-status-trigger";
import { AddBotButton } from "@/features/meetings/components/add-bot-button";
import type { MeetingWithSession } from "@/features/meetings/lib/calendar-utils";
import {
  formatTimeRange,
  formatMeetingDuration,
  formatAttendeesCount,
  getMeetingBotStatus,
} from "@/features/meetings/lib/calendar-utils";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface MeetingsListItemProps {
  meeting: MeetingWithSession;
  onMeetingClick?: (meeting: MeetingWithSession) => void;
}

export function MeetingsListItem({
  meeting,
  onMeetingClick,
}: MeetingsListItemProps) {
  const botStatus = getMeetingBotStatus(meeting, meeting.botSession);
  const isPast = meeting.end < new Date();
  const isUpcoming = meeting.start > new Date();
  const botSession = meeting.botSession;
  const hasRecording = !!(
    botSession?.recordingId && botSession?.projectId
  );

  const titleDateContent = (
    <>
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
    </>
  );

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        isPast && "opacity-75",
        onMeetingClick && "cursor-pointer"
      )}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {onMeetingClick ? (
            <button
              type="button"
              className="flex-1 space-y-2 text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
              aria-label={`View details for ${meeting.title || "Untitled Meeting"}`}
              onClick={() => onMeetingClick(meeting)}
            >
              {titleDateContent}
            </button>
          ) : (
            <div className="flex-1 space-y-2">{titleDateContent}</div>
          )}

          {/* Bot Status Badge or Add Bot */}
          <div
            className="flex min-h-[44px] items-center gap-2 sm:items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {botStatus === "no_bot" ? (
              isUpcoming ? (
                <AddBotButton meeting={meeting} variant="button" />
              ) : (
                <span className="text-xs text-muted-foreground">No bot</span>
              )
            ) : (
              <>
                <BotSessionStatusTrigger
                  status={botStatus}
                  sessionId={botSession?.id}
                  error={botSession?.error}
                />
                {hasRecording && (
                  <Link
                    href={`/projects/${botSession!.projectId}/recordings/${botSession!.recordingId}`}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-primary transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    aria-label="View recording"
                  >
                    <FileVideoIcon className="h-4 w-4" />
                    <span>View Recording</span>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
