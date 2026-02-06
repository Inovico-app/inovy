"use client";

import { CalendarGrid } from "@/features/meetings/components/calendar-grid";
import { CalendarHeader, type CalendarView } from "@/features/meetings/components/calendar-header";
import { matchMeetingsWithSessions } from "@/features/meetings/lib/calendar-utils";
import type { CalendarEvent } from "@/server/services/google-calendar.service";
import type { BotSession } from "@/server/db/schema/bot-sessions";
import { addMonths, format, parse, startOfMonth } from "date-fns";
import { parseAsString, useQueryState } from "nuqs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  const router = useRouter();
  const [monthParam, setMonthParam] = useQueryState(
    "month",
    parseAsString.withDefault(format(startOfMonth(initialDate), "yyyy-MM"))
  );
  const [view, setView] = useQueryState(
    "view",
    parseAsString.withDefault("month")
  );

  // Parse month from URL param or use initialDate
  const currentDate = monthParam
    ? parse(monthParam, "yyyy-MM", new Date())
    : startOfMonth(initialDate);

  const meetingsWithSessions = matchMeetingsWithSessions(meetings, botSessions);

  const handlePreviousMonth = () => {
    const newDate = startOfMonth(addMonths(currentDate, -1));
    setMonthParam(format(newDate, "yyyy-MM"));
    router.refresh();
  };

  const handleNextMonth = () => {
    const newDate = startOfMonth(addMonths(currentDate, 1));
    setMonthParam(format(newDate, "yyyy-MM"));
    router.refresh();
  };

  const handleToday = () => {
    const today = startOfMonth(new Date());
    setMonthParam(format(today, "yyyy-MM"));
    router.refresh();
  };

  const handleDayClick = (date: Date) => {
    // Show user feedback until day details modal is implemented
    toast.info("Day details view coming soon", {
      description: `Selected ${format(date, "MMMM d, yyyy")}`,
    });
  };

  return (
    <div className="space-y-4">
      <CalendarHeader
        currentDate={currentDate}
        view={view as CalendarView}
        onViewChange={(newView) => {
          if (newView === "month") {
            setView(newView);
          }
        }}
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
