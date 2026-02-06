"use client";

import { CalendarGrid } from "./calendar-grid";
import { CalendarHeader, type CalendarView } from "./calendar-header";
import { MeetingsList } from "../meetings/meetings-list";
import { matchMeetingsWithSessions } from "@/features/meetings/lib/calendar-utils";
import type { MeetingWithSession } from "@/features/meetings/lib/calendar-utils";
import type { MeetingBotStatus } from "@/features/meetings/lib/calendar-utils";
import type { CalendarEvent } from "@/server/services/google-calendar.service";
import type { BotSession } from "@/server/db/schema/bot-sessions";
import { addMonths, format, parse, startOfMonth } from "date-fns";
import {
  parseAsString,
  parseAsInteger,
  useQueryState,
} from "nuqs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface CalendarViewProps {
  initialDate?: Date;
  meetings: CalendarEvent[];
  botSessions: Map<string, BotSession>;
  // List view props
  paginatedMeetings?: MeetingWithSession[];
  currentPage?: number;
  totalPages?: number;
  total?: number;
  selectedStatus?: MeetingBotStatus | "all";
}

export function CalendarViewComponent({
  initialDate = new Date(),
  meetings,
  botSessions,
  paginatedMeetings,
  currentPage: initialCurrentPage = 1,
  totalPages = 1,
  total = 0,
  selectedStatus: initialSelectedStatus = "all",
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
  const [currentPage, setCurrentPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(initialCurrentPage)
  );
  const [selectedStatusParam, setSelectedStatusParam] = useQueryState(
    "botStatus",
    parseAsString.withDefault(initialSelectedStatus)
  );
  const selectedStatus = (selectedStatusParam as MeetingBotStatus | "all") || initialSelectedStatus;

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

  const handleViewChange = (newView: CalendarView) => {
    if (newView === "month" || newView === "list") {
      setView(newView);
      // Reset to page 1 when switching views
      if (newView === "list") {
        setCurrentPage(1);
      }
      router.refresh();
    }
  };

  const handleStatusChange = (status: MeetingBotStatus | "all") => {
    setSelectedStatusParam(status);
    // Reset to page 1 when changing filter
    setCurrentPage(1);
    router.refresh();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    router.refresh();
  };

  const handleClearFilters = () => {
    setSelectedStatusParam("all");
    setCurrentPage(1);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <CalendarHeader
        currentDate={currentDate}
        view={view as CalendarView}
        onViewChange={handleViewChange}
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
      {view === "list" && paginatedMeetings && (
        <MeetingsList
          meetings={paginatedMeetings}
          allMeetings={meetingsWithSessions}
          currentPage={currentPage}
          totalPages={totalPages}
          total={total}
          selectedStatus={selectedStatus}
          onStatusChange={handleStatusChange}
          onPageChange={handlePageChange}
          onClearFilters={handleClearFilters}
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
