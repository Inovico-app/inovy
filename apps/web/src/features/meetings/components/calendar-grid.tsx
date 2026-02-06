"use client";

import { CalendarEventItem } from "@/features/meetings/components/calendar-event-item";
import {
  getCalendarDays,
  groupMeetingsByDate,
  type CalendarDay,
  type MeetingWithSession,
} from "@/features/meetings/lib/calendar-utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface CalendarGridProps {
  currentDate: Date;
  meetings: MeetingWithSession[];
  onDayClick?: (date: Date) => void;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarGrid({
  currentDate,
  meetings,
  onDayClick,
}: CalendarGridProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getCalendarDays(year, month, 0); // 0 = Sunday
  const meetingsByDate = groupMeetingsByDate(meetings);

  const handleDayClick = (day: CalendarDay) => {
    if (onDayClick && day.isCurrentMonth) {
      onDayClick(day.date);
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="border-r p-2 text-center text-sm font-medium text-muted-foreground last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dateKey = format(day.date, "yyyy-MM-dd");
          const dayMeetings = meetingsByDate.get(dateKey) ?? [];

          return (
            <button
              type="button"
              key={`${day.date.toISOString()}-${index}`}
              disabled={!onDayClick || !day.isCurrentMonth}
              aria-current={day.isToday ? "date" : undefined}
              aria-disabled={!onDayClick || !day.isCurrentMonth}
              className={cn(
                "min-h-[100px] w-full text-left border-b border-r p-2 transition-colors last:border-r-0",
                !day.isCurrentMonth && "bg-muted/30",
                day.isToday && "bg-primary/5",
                day.isCurrentMonth && "hover:bg-accent/50",
                onDayClick && day.isCurrentMonth && "cursor-pointer",
                (!onDayClick || !day.isCurrentMonth) && "cursor-default"
              )}
              onClick={() => handleDayClick(day)}
            >
              <div
                className={cn(
                  "mb-1 text-sm font-medium",
                  day.isToday &&
                    "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground",
                  !day.isToday && day.isCurrentMonth && "text-foreground",
                  !day.isCurrentMonth && "text-muted-foreground"
                )}
              >
                {day.dayOfMonth}
              </div>
              <div className="space-y-1 group">
                {dayMeetings.length === 0 ? (
                  <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
                    No meetings
                  </div>
                ) : (
                  dayMeetings
                    .slice(0, 3)
                    .map((meeting) => (
                      <CalendarEventItem
                        key={meeting.id}
                        meeting={meeting}
                        compact
                      />
                    ))
                )}
                {dayMeetings.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayMeetings.length - 3} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
