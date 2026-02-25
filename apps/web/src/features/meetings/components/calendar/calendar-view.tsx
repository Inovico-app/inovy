"use client";

import { useBotSessionsQuery } from "@/features/meetings/hooks/use-bot-sessions-query";
import { useMeetingStatusCounts } from "@/features/meetings/hooks/use-meeting-status-counts";
import { useMeetingsQuery } from "@/features/meetings/hooks/use-meetings-query";
import type {
  MeetingBotStatusFilter,
  MeetingWithSession,
  TimePeriod,
} from "@/features/meetings/lib/calendar-utils";
import {
  filterMeetingsByBotStatus,
  filterMeetingsByTimePeriod,
  getMonthRange,
  matchMeetingsWithSessions,
  validateBotStatus,
} from "@/features/meetings/lib/calendar-utils";
import { loadMoreMeetings } from "@/features/meetings/lib/meetings-pagination";
import {
  addMonths,
  format,
  isWithinInterval,
  parse,
  startOfMonth,
} from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MeetingDetailsModal } from "../meeting-details-modal";
import { MeetingsList } from "../meetings/meetings-list";
import { CalendarGrid } from "./calendar-grid";
import { CalendarHeader, type CalendarView } from "./calendar-header";

interface CalendarViewProps {
  initialDate?: Date;
  selectedStatus?: MeetingBotStatusFilter;
}

const VIEW_STORAGE_KEY = "meetings-view-preference";
const PAGE_SIZE = 20;
const MAX_VISIBLE_LIMIT = 500;

function validateTimePeriod(value: string | undefined): TimePeriod {
  if (value === "upcoming" || value === "past") {
    return value;
  }
  return "upcoming";
}

export function CalendarViewComponent({
  initialDate = new Date(),
  selectedStatus: initialSelectedStatus = "all",
}: CalendarViewProps) {
  const searchParams = useSearchParams();
  const viewContainerRef = useRef<HTMLDivElement>(null);
  const previousViewRef = useRef<string | null>(null);
  const hasInitializedFromStorage = useRef(false);
  const [selectedMeeting, setSelectedMeeting] =
    useState<MeetingWithSession | null>(null);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);

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
  const [timePeriodParam, setTimePeriodParam] = useQueryState(
    "period",
    parseAsString.withDefault("upcoming")
  );
  const [visibleLimit, setVisibleLimit] = useQueryState(
    "limit",
    parseAsInteger.withDefault(PAGE_SIZE)
  );

  const selectedStatus = validateBotStatus(selectedStatusParam);
  const timePeriod = validateTimePeriod(timePeriodParam);

  const currentDate = monthParam
    ? parse(monthParam, "yyyy-MM", new Date())
    : startOfMonth(initialDate);

  // Fetch meetings for current month (with padding)
  const { data: meetings = [], isLoading: isLoadingMeetings } =
    useMeetingsQuery({
      month: currentDate,
      enabled: view === "month" || view === "list",
    });

  // Filter meetings to current month range for calendar view
  const currentMonthRange = useMemo(
    () => getMonthRange(currentDate),
    [currentDate]
  );
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

  const botSessions = useMemo(() => {
    return new Map(Object.entries(botSessionsData));
  }, [botSessionsData]);

  const meetingsWithSessions = useMemo(
    () => matchMeetingsWithSessions(meetingsForCurrentMonth, botSessions),
    [meetingsForCurrentMonth, botSessions]
  );

  // Filter by bot status
  const statusFilteredMeetings = useMemo(
    () => filterMeetingsByBotStatus(meetingsWithSessions, selectedStatus),
    [meetingsWithSessions, selectedStatus]
  );

  // For list view: also filter by time period (upcoming/past)
  const listFilteredMeetings = useMemo(() => {
    if (view !== "list") return statusFilteredMeetings;
    return filterMeetingsByTimePeriod(statusFilteredMeetings, timePeriod);
  }, [view, statusFilteredMeetings, timePeriod]);

  // Calendar view uses status-filtered meetings (no time period filter)
  const calendarFilteredMeetings = statusFilteredMeetings;

  // Load-more result for list view
  const loadMoreResult = useMemo(() => {
    if (view !== "list") return null;
    const clampedLimit = Math.max(
      1,
      Math.min(visibleLimit ?? PAGE_SIZE, MAX_VISIBLE_LIMIT)
    );
    return loadMoreMeetings(listFilteredMeetings, {
      limit: clampedLimit,
      timePeriod,
    });
  }, [view, listFilteredMeetings, visibleLimit, timePeriod]);

  const statusCounts = useMeetingStatusCounts({
    meetings: meetingsWithSessions,
  });
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
    if (
      typeof window !== "undefined" &&
      (view === "month" || view === "list")
    ) {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    }
  }, [view]);

  // Scroll to top when view changes
  useEffect(() => {
    if (previousViewRef.current && previousViewRef.current !== view) {
      viewContainerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    previousViewRef.current = view;
  }, [view]);

  const handlePreviousMonth = () => {
    const newDate = startOfMonth(addMonths(currentDate, -1));
    setMonthParam(format(newDate, "yyyy-MM"));
  };

  const handleNextMonth = () => {
    const newDate = startOfMonth(addMonths(currentDate, 1));
    setMonthParam(format(newDate, "yyyy-MM"));
  };

  const handleToday = () => {
    const today = startOfMonth(new Date());
    setMonthParam(format(today, "yyyy-MM"));
  };

  const handleDayClick = (date: Date) => {
    toast.info("Day details view coming soon", {
      description: `Selected ${format(date, "MMMM d, yyyy")}`,
    });
  };

  const handleViewChange = (newView: CalendarView) => {
    if (newView === "month" || newView === "list") {
      setView(newView);
      if (newView === "list") {
        setCurrentPage(1);
        setVisibleLimit(PAGE_SIZE);
      }
    }
  };

  const handleStatusChange = useCallback(
    (status: MeetingBotStatusFilter) => {
      setSelectedStatusParam(status);
      setCurrentPage(1);
      setVisibleLimit(PAGE_SIZE);
    },
    [setSelectedStatusParam, setCurrentPage, setVisibleLimit]
  );

  const handleTimePeriodChange = useCallback(
    (period: TimePeriod) => {
      setTimePeriodParam(period);
      setCurrentPage(1);
      setVisibleLimit(PAGE_SIZE);
    },
    [setTimePeriodParam, setCurrentPage, setVisibleLimit]
  );

  const handleLoadMore = useCallback(() => {
    setVisibleLimit((prev) => (prev ?? PAGE_SIZE) + PAGE_SIZE);
  }, [setVisibleLimit]);

  const handleClearFilters = useCallback(() => {
    setSelectedStatusParam("all");
    setTimePeriodParam("upcoming");
    setCurrentPage(1);
    setVisibleLimit(PAGE_SIZE);
  }, [
    setSelectedStatusParam,
    setTimePeriodParam,
    setCurrentPage,
    setVisibleLimit,
  ]);

  const handleMeetingClick = (meeting: MeetingWithSession) => {
    setSelectedMeeting(meeting);
    setMeetingModalOpen(true);
  };

  const filteredCount =
    view === "list"
      ? listFilteredMeetings.length
      : statusFilteredMeetings.length;
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
        timePeriod={timePeriod}
        onTimePeriodChange={handleTimePeriodChange}
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
                  meetings={calendarFilteredMeetings}
                  onDayClick={handleDayClick}
                  onMeetingClick={handleMeetingClick}
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
              ) : loadMoreResult ? (
                <MeetingsList
                  meetings={loadMoreResult.meetings}
                  total={loadMoreResult.total}
                  hasMore={loadMoreResult.hasMore}
                  allMeetingsCount={meetingsWithSessions.length}
                  isFiltered={
                    selectedStatus !== "all" || timePeriod !== "upcoming"
                  }
                  onLoadMore={handleLoadMore}
                  onClearFilters={handleClearFilters}
                  onMeetingClick={handleMeetingClick}
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

      <MeetingDetailsModal
        meeting={selectedMeeting}
        open={meetingModalOpen}
        onOpenChange={(open) => {
          setMeetingModalOpen(open);
          if (!open) setSelectedMeeting(null);
        }}
        onSuccess={() => {
          setMeetingModalOpen(false);
          setSelectedMeeting(null);
        }}
      />
    </div>
  );
}

