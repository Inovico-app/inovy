"use client";

import { BotStatusBadge } from "@/features/bot/components/bot-status-badge";
import { AddBotButton } from "@/features/meetings/components/add-bot-button";
import { formatTimeRange } from "@/features/meetings/lib/calendar-utils";
import type { MeetingWithSession } from "@/features/meetings/lib/calendar-utils";
import { cn } from "@/lib/utils";

interface CalendarEventItemProps {
  meeting: MeetingWithSession;
  compact?: boolean;
}

export function CalendarEventItem({
  meeting,
  compact = false,
}: CalendarEventItemProps) {
  const timeDisplay = formatTimeRange(meeting.start, meeting.end);
  const hasBotSession = !!meeting.botSession;

  if (compact) {
    return (
      <div
        role="group"
        aria-label={`${meeting.title} - ${timeDisplay}`}
        className={cn(
          "group w-full rounded-md p-1.5 text-xs transition-colors",
          "hover:bg-accent",
          hasBotSession && "bg-primary/5"
        )}
        title={`${meeting.title} - ${timeDisplay}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <div className="flex-shrink-0">
            <div className="h-2 w-2 rounded-full bg-primary" />
          </div>
          <span className="truncate font-medium">{meeting.title}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-muted-foreground">{timeDisplay}</span>
          {hasBotSession && meeting.botSession ? (
            <BotStatusBadge
              status={meeting.botSession.botStatus}
              className="scale-75"
            />
          ) : (
            <AddBotButton meeting={meeting} variant="icon" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={`${meeting.title} - ${timeDisplay}`}
      className={cn(
        "group w-full rounded-lg border p-2 text-sm transition-colors",
        "hover:bg-accent",
        hasBotSession && "border-primary/20 bg-primary/5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{meeting.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {timeDisplay}
          </div>
          {meeting.attendees && meeting.attendees.length > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              {meeting.attendees.length} attendee
              {meeting.attendees.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
        {hasBotSession && meeting.botSession ? (
          <BotStatusBadge status={meeting.botSession.botStatus} />
        ) : (
          <AddBotButton meeting={meeting} variant="icon" />
        )}
      </div>
    </div>
  );
}
