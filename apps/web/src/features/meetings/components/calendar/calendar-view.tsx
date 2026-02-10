"use client";

import { CalendarGrid } from "./calendar-grid";
import { CalendarHeader, type CalendarView } from "./calendar-header";
import { MeetingsList } from "../meetings/meetings-list";
import { matchMeetingsWithSessions, filterMeetingsByBotStatus, sortMeetingsChronologically, getMonthRange } from "@/features/meetings/lib/calendar-utils";
import type { MeetingWithSession } from "@/features/meetings/lib/calendar-utils";
import type { MeetingBotStatus } from "@/features/meetings/lib/calendar-utils";
import { useMeetingsQuery } from "@/features/meetings/hooks/use-meetings-query";
import { useBotSessionsQuery } from "@/features/meetings/hooks/use-bot-sessions-query";
import { addMonths, format, parse, startOfMonth, isWithinInterval } from "date-fns";
import {
  parseAsString,
  parseAsInteger,
  useQueryState,
} from "nuqs";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useMemo } from "react";
import { paginateMeetings } from "@/features/meetings/lib/meetings-pagination";

interface CalendarViewProps {
  initialDate?: Date;
  selectedStatus?: MeetingBotStatus | "all";
}

const VIEW_STORAGE_KEY = "meetings-view-preference";

export function CalendarViewComponent({
  initialDate = new Date(),
  selectedStatus: initialSelectedStatus = "all",
}: CalendarViewProps) {
  const searchParams = useSearchParams();
  const viewContainerRef = useRef<HTMLDivElement>(null);
  const previousViewRef = useRef<string | null>(null);
  const hasInitializedFromStorage = useRef(false);

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
    parseAsInteger.withDefault(1)
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

  const currentMonthStart = startOfMonth(currentDate);

  // Fetch meetings for current month (with padding)
  const { data: meetings = [], isLoading: isLoadingMeetings } = useMeetingsQuery({
    month: currentDate,
    enabled: view === "month" || view === "list",
  });

  // Filter meetings to current month range for calendar view
  const currentMonthRange = useMemo(() => getMonthRange(currentDate), [currentDate]);
  const meetingsForCurrentMonth = useMemo(() => {
    return meetings.filter((meeting) =>
      isWithinInterval(meeting.start, currentMonthRange)
    );
  }, [meetings, currentMonthRange]);

  // Get calendar event IDs for bot sessions (use all meetings, not just current month)
  // This ensures we have bot session data for adjacent months too
  const calendarEventIds = useMemo(
    () => meetings.map((m) => m.id),
    [meetings]
  );

  // Fetch bot sessions
  const { data: botSessionsData = {}, isLoading: isLoadingBotSessions } =
    useBotSessionsQuery({
      calendarEventIds,
      enabled: calendarEventIds.length > 0,
    });

  // Convert bot sessions object to Map
  const botSessions = useMemo(() => {
    return new Map(Object.entries(botSessionsData));
  }, [botSessionsData]);

  // Match meetings with bot sessions
  const meetingsWithSessions = useMemo(
    () => matchMeetingsWithSessions(meetingsForCurrentMonth, botSessions),
    [meetingsForCurrentMonth, botSessions]
  );

  // Paginate meetings for list view
  const paginatedResult = useMemo(() => {
    if (view === "list") {
      return paginateMeetings(meetingsWithSessions, {
        page: currentPage,
        pageSize: 20,
        botStatus: selectedStatus,
      });
    }
    return null;
  }, [view, meetingsWithSessions, currentPage, selectedStatus]);

  const isLoading = isLoadingMeetings || isLoadingBotSessions;

  // Initialize view from localStorage if URL param is missing (client-side only)
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !hasInitializedFromStorage.current &&
      !searchParams.has("view")
    ) {
      const stored = localStorage.getItem(VIEW_STORAGE_KEY);
      if (stored === "month" || stored === "list") {
        setView(stored);
      }
      hasInitializedFromStorage.current = true;
    }
  }, [searchParams, setView]);

  // Persist view preference to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && (view === "month" || view === "list")) {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    }
  }, [view]);

  // Scroll to top when view changes
  useEffect(() => {
    if (previousViewRef.current && previousViewRef.current !== view) {
      // Scroll to top of the view container when switching views
      viewContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      // Also scroll window to top for better UX
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    previousViewRef.current = view;
  }, [view]);

  const handlePreviousMonth = () => {
    const newDate = startOfMonth(addMonths(currentDate, -1));
    setMonthParam(format(newDate, "yyyy-MM"));
    // No router.refresh() needed - React Query handles data fetching
  };

  const handleNextMonth = () => {
    const newDate = startOfMonth(addMonths(currentDate, 1));
    setMonthParam(format(newDate, "yyyy-MM"));
    // No router.refresh() needed - React Query handles data fetching
  };

  const handleToday = () => {
    const today = startOfMonth(new Date());
    setMonthParam(format(today, "yyyy-MM"));
    // No router.refresh() needed - React Query handles data fetching
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
      // No router.refresh() needed - React Query handles data fetching
    }
  };

  const handleStatusChange = (status: MeetingBotStatus | "all") => {
    setSelectedStatusParam(status);
    // Reset to page 1 when changing filter
    setCurrentPage(1);
    // No router.refresh() needed - client-side filtering
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // No router.refresh() needed - client-side pagination
  };

  const handleClearFilters = () => {
    setSelectedStatusParam("all");
    setCurrentPage(1);
    // No router.refresh() needed - client-side filtering
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
      <div ref={viewContainerRef} className="relative min-h-[400px]">
        <AnimatePresence mode="wait">
          {view === "month" && (
            <motion.div
              key="month-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {isLoading ? (
                <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                  Loading calendar...
                </div>
              ) : (
                <CalendarGrid
                  currentDate={currentDate}
                  meetings={meetingsWithSessions}
                  onDayClick={handleDayClick}
                />
              )}
            </motion.div>
          )}
          {view === "list" && (
            <motion.div
              key="list-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {isLoading ? (
                <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                  Loading meetings...
                </div>
              ) : paginatedResult ? (
                <MeetingsList
                  meetings={paginatedResult.meetings}
                  allMeetings={meetingsWithSessions}
                  currentPage={paginatedResult.currentPage}
                  totalPages={paginatedResult.totalPages}
                  total={paginatedResult.total}
                  selectedStatus={selectedStatus}
                  onStatusChange={handleStatusChange}
                  onPageChange={handlePageChange}
                  onClearFilters={handleClearFilters}
                />
              ) : null}
            </motion.div>
          )}
          {view === "week" && (
            <motion.div
              key="week-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                Week view coming soon
              </div>
            </motion.div>
          )}
          {view === "day" && (
            <motion.div
              key="day-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                Day view coming soon
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
