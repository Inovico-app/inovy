"use client";

import { CalendarGrid } from "@/features/meetings/components/calendar-grid";
import { CalendarHeader, type CalendarView } from "@/features/meetings/components/calendar-header";
import { matchMeetingsWithSessions, type MeetingWithSession } from "@/features/meetings/lib/calendar-utils";
import type { CalendarEvent } from "@/server/services/google-calendar.service";
import type { BotSession } from "@/server/db/schema/bot-sessions";
import { addMonths, startOfMonth } from "date-fns";
import { useState } from "react";

interface CalendarViewProps {
  initialDate?: Date;
  meetings: CalendarEvent[];
  botSessions: Map<string, BotSession>;
}

export function CalendarViewComponent({
  initialDate = new Date(),
  meetings,
  botSessions,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(startOfMonth(initialDate));
  const [view, setView] = useState<CalendarView>("month");

  const meetingsWithSessions = matchMeetingsWithSessions(meetings, botSessions);

  const handlePreviousMonth = () => {
    setCurrentDate((prev) => startOfMonth(addMonths(prev, -1)));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => startOfMonth(addMonths(prev, 1)));
  };

  const handleToday = () => {
    setCurrentDate(startOfMonth(new Date()));
  };

  const handleDayClick = (date: Date) => {
    // TODO: Show day details modal
    // Future implementation will open a modal with meeting details for the selected day
  };

  return (
    <div className="space-y-4">
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
      />
      {view === "month" && (
        <CalendarGrid
          currentDate={currentDate}
          meetings={meetingsWithSessions}
          onDayClick={handleDayClick}
        />
      )}
      {view === "week" && (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Week view coming soon
        </div>
      )}
      {view === "day" && (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Day view coming soon
        </div>
      )}
    </div>
  );
}
