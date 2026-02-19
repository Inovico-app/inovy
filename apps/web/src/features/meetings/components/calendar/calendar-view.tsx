"use client";

import { CalendarGrid } from "./calendar-grid";
import { CalendarHeader, type CalendarView } from "./calendar-header";
import { MeetingsList } from "../meetings/meetings-list";
import {
  matchMeetingsWithSessions,
  filterMeetingsByBotStatus,
  getMonthRange,
  validateBotStatus,
} from "@/features/meetings/lib/calendar-utils";
import type {
  MeetingWithSession,
  MeetingBotStatusFilter,
} from "@/features/meetings/lib/calendar-utils";
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
import { paginateMeetingsOnly } from "@/features/meetings/lib/meetings-pagination";
import { useMeetingStatusCounts } from "@/features/meetings/hooks/use-meeting-status-counts";

interface CalendarViewProps {
  initialDate?: Date;
  selectedStatus?: MeetingBotStatusFilter;
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
  const selectedStatus = validateBotStatus(selectedStatusParam);

  // Parse month from URL param or use initialDate
  const currentDate = monthParam
    ? parse(monthParam, "yyyy-MM", new Date())
    : startOfMonth(initialDate);

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

  // Get calendar event IDs for bot sessions (use current month meetings only)
  const calendarEventIds = useMemo(
    () => meetingsForCurrentMonth.map((m) => m.id),
    [meetingsForCurrentMonth]
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

  // Filter meetings for both views
  const filteredMeetings = useMemo(
    () => filterMeetingsByBotStatus(meetingsWithSessions, selectedStatus),
    [meetingsWithSessions, selectedStatus]
  );

  // Paginate meetings for list view (filteredMeetings is pre-filtered)
  const paginatedResult = useMemo(() => {
    if (view === "list") {
      return paginateMeetingsOnly(filteredMeetings, {
        page: currentPage,
        pageSize: 20,
      });
    }
    return null;
  }, [view, filteredMeetings, currentPage]);

  const statusCounts = useMeetingStatusCounts({ meetings: meetingsWithSessions });
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

  const handleStatusChange = (status: MeetingBotStatusFilter) => {
    setSelectedStatusParam(status);
    // Reset to page 1 when changing filter
    setCurrentPage(1);
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

  const filteredCount = filteredMeetings.length;
  const totalCount = meetingsWithSessions.length;

  return (
    <div className="space-y-4">
      <CalendarHeader
        currentDate={currentDate}
        view={view as CalendarView}
        onViewChange={handleViewChange}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
        selectedStatus={selectedStatus}
        onStatusChange={handleStatusChange}
        statusCounts={statusCounts}
        filteredCount={filteredCount}
        totalCount={totalCount}
        onClearFilters={handleClearFilters}
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
                <div
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  className="rounded-lg border bg-card p-8 text-center text-muted-foreground"
                >
                  <span className="sr-only">Loading calendar…</span>
                  Loading calendar...
                </div>
              ) : (
                <CalendarGrid
                  currentDate={currentDate}
                  meetings={filteredMeetings}
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
                <div
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  className="rounded-lg border bg-card p-8 text-center text-muted-foreground"
                >
                  <span className="sr-only">Loading meetings…</span>
                  Loading meetings...
                </div>
              ) : paginatedResult ? (
                <MeetingsList
                  meetings={paginatedResult.meetings}
                  currentPage={paginatedResult.currentPage}
                  totalPages={paginatedResult.totalPages}
                  total={paginatedResult.total}
                  allMeetingsCount={meetingsWithSessions.length}
                  isFiltered={selectedStatus !== "all"}
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
