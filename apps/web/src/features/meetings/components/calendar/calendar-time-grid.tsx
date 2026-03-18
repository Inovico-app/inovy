"use client";

import type { MeetingWithSession } from "@/features/meetings/lib/calendar-utils";
import { useCurrentTimeIndicator } from "@/features/meetings/hooks/use-current-time-indicator";
import { useTimeGridScroll } from "@/features/meetings/hooks/use-time-grid-scroll";
import {
  HOUR_HEIGHT,
  HOURS,
  DAY_HEIGHT,
  formatHourLabel,
  getMeetingsForDate,
  splitMeetingsByType,
  computeOverlapLayout,
} from "@/features/meetings/lib/time-grid-utils";
import { cn } from "@/lib/utils";
import { format, isToday } from "date-fns";
import { useRef } from "react";
import { CalendarEventItem } from "./calendar-event-item";

interface CalendarTimeGridProps {
  dates: Date[];
  meetings: MeetingWithSession[];
  onMeetingClick?: (meeting: MeetingWithSession) => void;
}

export function CalendarTimeGrid({
  dates,
  meetings,
  onMeetingClick,
}: CalendarTimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { topOffset: currentTimeOffset, isTodayDate } =
    useCurrentTimeIndicator(HOUR_HEIGHT);

  useTimeGridScroll({ containerRef: scrollRef });

  const { timedMeetings } = splitMeetingsByType(meetings, dates);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Sticky header with day labels */}
      <div
        className="grid border-b bg-card sticky top-0 z-10"
        style={{
          gridTemplateColumns: `60px repeat(${dates.length}, 1fr)`,
        }}
      >
        {/* Empty corner for time gutter */}
        <div className="border-r p-2" />
        {/* Day column headers */}
        {dates.map((date) => (
          <div
            key={date.toISOString()}
            className={cn(
              "border-r last:border-r-0 p-2 text-center",
              isToday(date) && "bg-primary/5",
            )}
          >
            <div className="text-xs text-muted-foreground">
              {format(date, "EEE")}
            </div>
            <div
              className={cn(
                "text-sm font-semibold",
                isToday(date) &&
                  "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center mx-auto",
              )}
            >
              {format(date, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable time grid body */}
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 200px)" }}
      >
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: `60px repeat(${dates.length}, 1fr)`,
            height: `${DAY_HEIGHT}px`,
          }}
        >
          {/* Time gutter */}
          <div className="relative border-r">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full pr-2 text-right"
                style={{
                  top: `${hour * HOUR_HEIGHT}px`,
                  height: `${HOUR_HEIGHT}px`,
                }}
              >
                <span className="text-[10px] text-muted-foreground -translate-y-1/2 block">
                  {hour === 0 ? "" : formatHourLabel(hour)}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {dates.map((date, dateIndex) => {
            const dayMeetings = getMeetingsForDate(timedMeetings, date);
            const layouts = computeOverlapLayout(dayMeetings, HOUR_HEIGHT);
            const isLast = dateIndex === dates.length - 1;

            return (
              <div
                key={date.toISOString()}
                className={cn("relative", !isLast && "border-r")}
              >
                {/* Hour gridlines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-border/40"
                    style={{ top: `${hour * HOUR_HEIGHT}px` }}
                  />
                ))}

                {/* Half-hour gridlines */}
                {HOURS.map((hour) => (
                  <div
                    key={`${hour}-half`}
                    className="absolute w-full border-t border-border/20 border-dashed"
                    style={{ top: `${hour * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }}
                  />
                ))}

                {/* Current time indicator */}
                {isTodayDate(date) && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${currentTimeOffset}px` }}
                  >
                    <div className="flex items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1" />
                      <div className="flex-1 h-[2px] bg-red-500" />
                    </div>
                  </div>
                )}

                {/* Events */}
                <div className="absolute inset-0 px-0.5">
                  {layouts.map((layout) => {
                    const leftPercent =
                      (layout.column / layout.totalColumns) * 100;
                    const widthPercent = (1 / layout.totalColumns) * 100;

                    return (
                      <div
                        key={layout.meeting.id}
                        className="absolute"
                        style={{
                          top: `${layout.top}px`,
                          height: `${layout.height}px`,
                          left: `${leftPercent}%`,
                          width: `calc(${widthPercent}% - 2px)`,
                        }}
                      >
                        <CalendarEventItem
                          meeting={layout.meeting}
                          compact
                          onMeetingClick={onMeetingClick}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
