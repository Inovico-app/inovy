"use client";

import { BotStatusBadge } from "@/features/bot/components/bot-status-badge";
import { AddBotButton } from "@/features/meetings/components/add-bot-button";
import type { MeetingWithSession } from "@/features/meetings/lib/calendar-utils";
import { formatTimeRange } from "@/features/meetings/lib/calendar-utils";
import { cn } from "@/lib/utils";

interface CalendarTimeEventProps {
  meeting: MeetingWithSession;
  top: number;
  height: number;
  column: number;
  totalColumns: number;
  onMeetingClick?: (meeting: MeetingWithSession) => void;
}

export function CalendarTimeEvent({
  meeting,
  top,
  height,
  column,
  totalColumns,
  onMeetingClick,
}: CalendarTimeEventProps) {
  const isShort = height < 40;
  const leftPercent = (column / totalColumns) * 100;
  const widthPercent = (1 / totalColumns) * 100;
  const hasNotEnded = meeting.end > new Date();

  return (
    <div
      className={cn(
        "absolute rounded-md border-l-2 border-primary bg-primary/10 px-1.5 text-left transition-colors",
        "hover:bg-primary/20",
        "overflow-hidden",
        isShort ? "py-0" : "py-0.5",
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: `${leftPercent}%`,
        width: `calc(${widthPercent}% - 2px)`,
      }}
    >
      {/* Clickable area for meeting details */}
      <button
        type="button"
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onMeetingClick?.(meeting);
        }}
        aria-label={`${meeting.title} at ${formatTimeRange(meeting.start, meeting.end)}`}
      >
        {isShort ? (
          <span className="text-[10px] font-medium leading-tight truncate block">
            {meeting.title}
          </span>
        ) : (
          <>
            <span className="text-xs font-medium leading-tight truncate block">
              {meeting.title}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight truncate block">
              {formatTimeRange(meeting.start, meeting.end)}
            </span>
          </>
        )}
      </button>

      {/* Bot status or Add Notetaker button */}
      {!isShort && height >= 56 && (
        <div
          className="mt-0.5 flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
          {meeting.botSession ? (
            <BotStatusBadge
              status={meeting.botSession.botStatus}
              error={meeting.botSession.error}
              className="scale-75 origin-left"
            />
          ) : (
            hasNotEnded && <AddBotButton meeting={meeting} variant="icon" />
          )}
        </div>
      )}
    </div>
  );
}
