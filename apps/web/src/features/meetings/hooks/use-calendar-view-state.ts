"use client";

import { useBotSessionsQuery } from "@/features/meetings/hooks/use-bot-sessions-query";
import { useMeetingStatusCounts } from "@/features/meetings/hooks/use-meeting-status-counts";
import { useMeetingsQuery } from "@/features/meetings/hooks/use-meetings-query";
import type {
  CalendarView,
  MeetingBotStatusFilter,
  MeetingWithSession,
  TimePeriod,
} from "@/features/meetings/lib/calendar-utils";
import {
  filterMeetingsByBotStatus,
  filterMeetingsByTimePeriod,
  getVisibleRange,
  matchMeetingsWithSessions,
  validateBotStatus,
} from "@/features/meetings/lib/calendar-utils";
import { loadMoreMeetings } from "@/features/meetings/lib/meetings-pagination";
import type { PaginatedMeetingsResult } from "@/features/meetings/lib/meetings-pagination";
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  isWithinInterval,
  parse,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { useSearchParams } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef } from "react";

const VIEW_STORAGE_KEY = "meetings-view-preference";
const PAGE_SIZE = 20;
const MAX_VISIBLE_LIMIT = 500;

const VALID_VIEWS: CalendarView[] = [
  "day",
  "work-week",
  "week",
  "month",
  "list",
];

function validateView(value: string | null | undefined): CalendarView {
  if (value && VALID_VIEWS.includes(value as CalendarView)) {
    return value as CalendarView;
  }
  return "month";
}

function validateTimePeriod(value: string | undefined): TimePeriod {
  if (value === "upcoming" || value === "past") {
    return value;
  }
  return "upcoming";
}

/** Views that use the date-based time grid (not month grid or list) */
function isTimeGridView(view: CalendarView): boolean {
  return view === "day" || view === "week" || view === "work-week";
}

interface UseCalendarViewStateProps {
  initialDate: Date;
  initialSelectedStatus: MeetingBotStatusFilter;
  isMobile?: boolean;
}

interface UseCalendarViewStateReturn {
  currentDate: Date;
  view: CalendarView;
  selectedStatus: MeetingBotStatusFilter;
  timePeriod: TimePeriod;
  isLoading: boolean;
  meetingsWithSessions: MeetingWithSession[];
  calendarFilteredMeetings: MeetingWithSession[];
  listFilteredMeetings: MeetingWithSession[];
  loadMoreResult: PaginatedMeetingsResult | null;
  statusCounts: Record<MeetingBotStatusFilter, number>;
  filteredCount: number;
  totalCount: number;
  viewContainerRef: React.RefObject<HTMLDivElement | null>;
  handlePrevious: () => void;
  handleNext: () => void;
  handleToday: () => void;
  handleDayClick: (date: Date) => void;
  handleViewChange: (newView: CalendarView) => void;
  handleStatusChange: (status: MeetingBotStatusFilter) => void;
  handleTimePeriodChange: (period: TimePeriod) => void;
  handleLoadMore: () => void;
  handleClearFilters: () => void;
}

export function useCalendarViewState({
  initialDate,
  initialSelectedStatus,
  isMobile = false,
}: UseCalendarViewStateProps): UseCalendarViewStateReturn {
  const searchParams = useSearchParams();
  const viewContainerRef = useRef<HTMLDivElement>(null);
  const previousViewRef = useRef<string | null>(null);
  const hasInitializedFromStorage = useRef(false);

  // URL state
  const [monthParam, setMonthParam] = useQueryState(
    "month",
    parseAsString.withDefault(format(startOfMonth(initialDate), "yyyy-MM")),
  );
  const [viewParam, setView] = useQueryState(
    "view",
    parseAsString.withDefault("month"),
  );
  const [dateParam, setDateParam] = useQueryState(
    "date",
    parseAsString.withDefault(format(initialDate, "yyyy-MM-dd")),
  );
  const [_currentPage, setCurrentPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1),
  );
  const [selectedStatusParam, setSelectedStatusParam] = useQueryState(
    "botStatus",
    parseAsString.withDefault(initialSelectedStatus),
  );
  const [timePeriodParam, setTimePeriodParam] = useQueryState(
    "period",
    parseAsString.withDefault("upcoming"),
  );
  const [visibleLimit, setVisibleLimit] = useQueryState(
    "limit",
    parseAsInteger.withDefault(PAGE_SIZE),
  );

  const view = validateView(viewParam);
  const selectedStatus = validateBotStatus(selectedStatusParam);
  const timePeriod = validateTimePeriod(timePeriodParam);

  // On mobile, always treat as list view
  const effectiveView: CalendarView = isMobile ? "list" : view;

  // Derive currentDate from the appropriate URL param based on view
  const currentDate = useMemo(() => {
    if (isTimeGridView(effectiveView) && dateParam) {
      const parsed = parse(dateParam, "yyyy-MM-dd", new Date());
      return isNaN(parsed.getTime()) ? startOfDay(initialDate) : parsed;
    }
    if (monthParam) {
      const parsed = parse(monthParam, "yyyy-MM", new Date());
      return isNaN(parsed.getTime()) ? startOfMonth(initialDate) : parsed;
    }
    return startOfMonth(initialDate);
  }, [effectiveView, dateParam, monthParam, initialDate]);

  // For data fetching, derive the month from currentDate for time-grid views
  const fetchMonth = useMemo(() => {
    if (isTimeGridView(effectiveView)) {
      return startOfMonth(currentDate);
    }
    return currentDate;
  }, [effectiveView, currentDate]);

  // Fetch meetings (enabled for all views)
  const { data: meetingsData, isLoading: isLoadingMeetings } = useMeetingsQuery(
    {
      month: fetchMonth,
      enabled: true,
    },
  );

  const meetings = useMemo(
    () => meetingsData?.events ?? [],
    [meetingsData?.events],
  );
  const calendarProvider = meetingsData?.calendarProvider;

  // Filter meetings to visible range
  const visibleRange = useMemo(
    () => getVisibleRange(currentDate, effectiveView),
    [currentDate, effectiveView],
  );
  const meetingsForVisibleRange = useMemo(() => {
    return meetings.filter((meeting) =>
      isWithinInterval(meeting.start, visibleRange),
    );
  }, [meetings, visibleRange]);

  // Get calendar event IDs for bot sessions
  const calendarEventIds = useMemo(
    () => meetingsForVisibleRange.map((m) => m.id),
    [meetingsForVisibleRange],
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
    () =>
      matchMeetingsWithSessions(
        meetingsForVisibleRange,
        botSessions,
        calendarProvider,
      ),
    [meetingsForVisibleRange, botSessions, calendarProvider],
  );

  // Filter by bot status
  const statusFilteredMeetings = useMemo(
    () => filterMeetingsByBotStatus(meetingsWithSessions, selectedStatus),
    [meetingsWithSessions, selectedStatus],
  );

  // For list view: also filter by time period
  const listFilteredMeetings = useMemo(() => {
    if (effectiveView !== "list") return statusFilteredMeetings;
    return filterMeetingsByTimePeriod(statusFilteredMeetings, timePeriod);
  }, [effectiveView, statusFilteredMeetings, timePeriod]);

  // Calendar/time-grid views use status-filtered meetings
  const calendarFilteredMeetings = statusFilteredMeetings;

  // Load-more result for list view
  const loadMoreResult = useMemo(() => {
    if (effectiveView !== "list") return null;
    const clampedLimit = Math.max(
      1,
      Math.min(visibleLimit ?? PAGE_SIZE, MAX_VISIBLE_LIMIT),
    );
    return loadMoreMeetings(listFilteredMeetings, {
      limit: clampedLimit,
      timePeriod,
    });
  }, [effectiveView, listFilteredMeetings, visibleLimit, timePeriod]);

  const statusCounts = useMeetingStatusCounts({
    meetings: meetingsWithSessions,
  });
  const isLoading = isLoadingMeetings || isLoadingBotSessions;

  // Initialize view from localStorage if URL param is missing
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !hasInitializedFromStorage.current &&
      !searchParams.has("view")
    ) {
      try {
        const stored = localStorage.getItem(VIEW_STORAGE_KEY);
        if (stored && VALID_VIEWS.includes(stored as CalendarView)) {
          setView(stored);
        }
      } catch {
        // localStorage may be unavailable
      }
      hasInitializedFromStorage.current = true;
    }
  }, [searchParams, setView]);

  // Persist view preference to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && VALID_VIEWS.includes(view)) {
      try {
        localStorage.setItem(VIEW_STORAGE_KEY, view);
      } catch {
        // localStorage may be unavailable
      }
    }
  }, [view]);

  // Scroll to top when view changes
  useEffect(() => {
    if (previousViewRef.current && previousViewRef.current !== viewParam) {
      viewContainerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    previousViewRef.current = viewParam;
  }, [viewParam]);

  // --- Navigation ---

  const handlePrevious = useCallback(() => {
    switch (effectiveView) {
      case "day": {
        const newDate = addDays(currentDate, -1);
        setDateParam(format(newDate, "yyyy-MM-dd"));
        // Update month param if we crossed a month boundary
        setMonthParam(format(startOfMonth(newDate), "yyyy-MM"));
        break;
      }
      case "week":
      case "work-week": {
        const newDate = addWeeks(currentDate, -1);
        setDateParam(format(newDate, "yyyy-MM-dd"));
        setMonthParam(format(startOfMonth(newDate), "yyyy-MM"));
        break;
      }
      case "month":
      case "list": {
        const newDate = startOfMonth(addMonths(currentDate, -1));
        setMonthParam(format(newDate, "yyyy-MM"));
        break;
      }
    }
  }, [effectiveView, currentDate, setDateParam, setMonthParam]);

  const handleNext = useCallback(() => {
    switch (effectiveView) {
      case "day": {
        const newDate = addDays(currentDate, 1);
        setDateParam(format(newDate, "yyyy-MM-dd"));
        setMonthParam(format(startOfMonth(newDate), "yyyy-MM"));
        break;
      }
      case "week":
      case "work-week": {
        const newDate = addWeeks(currentDate, 1);
        setDateParam(format(newDate, "yyyy-MM-dd"));
        setMonthParam(format(startOfMonth(newDate), "yyyy-MM"));
        break;
      }
      case "month":
      case "list": {
        const newDate = startOfMonth(addMonths(currentDate, 1));
        setMonthParam(format(newDate, "yyyy-MM"));
        break;
      }
    }
  }, [effectiveView, currentDate, setDateParam, setMonthParam]);

  const handleToday = useCallback(() => {
    const today = new Date();
    setDateParam(format(today, "yyyy-MM-dd"));
    setMonthParam(format(startOfMonth(today), "yyyy-MM"));
  }, [setDateParam, setMonthParam]);

  const handleDayClick = useCallback(
    (date: Date) => {
      // Switch to day view and navigate to that date
      setView("day");
      setDateParam(format(date, "yyyy-MM-dd"));
      setMonthParam(format(startOfMonth(date), "yyyy-MM"));
    },
    [setView, setDateParam, setMonthParam],
  );

  const handleViewChange = useCallback(
    (newView: CalendarView) => {
      // When switching between view types, sync the date/month params
      if (isTimeGridView(newView) && !isTimeGridView(effectiveView)) {
        // Switching from month/list to time-grid: set date to today if within current month, else first of month
        const today = new Date();
        const monthStart = startOfMonth(currentDate);
        const monthEnd = new Date(
          monthStart.getFullYear(),
          monthStart.getMonth() + 1,
          0,
        );
        const targetDate =
          today >= monthStart && today <= monthEnd ? today : monthStart;
        setDateParam(format(targetDate, "yyyy-MM-dd"));
      } else if (!isTimeGridView(newView) && isTimeGridView(effectiveView)) {
        // Switching from time-grid to month/list: sync month from current date
        setMonthParam(format(startOfMonth(currentDate), "yyyy-MM"));
      }

      setView(newView);
      if (newView === "list") {
        setCurrentPage(1);
        setVisibleLimit(PAGE_SIZE);
      }
    },
    [
      effectiveView,
      currentDate,
      setView,
      setDateParam,
      setMonthParam,
      setCurrentPage,
      setVisibleLimit,
    ],
  );

  const handleStatusChange = useCallback(
    (status: MeetingBotStatusFilter) => {
      setSelectedStatusParam(status);
      setCurrentPage(1);
      setVisibleLimit(PAGE_SIZE);
    },
    [setSelectedStatusParam, setCurrentPage, setVisibleLimit],
  );

  const handleTimePeriodChange = useCallback(
    (period: TimePeriod) => {
      setTimePeriodParam(period);
      setCurrentPage(1);
      setVisibleLimit(PAGE_SIZE);
    },
    [setTimePeriodParam, setCurrentPage, setVisibleLimit],
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

  const filteredCount =
    effectiveView === "list"
      ? listFilteredMeetings.length
      : statusFilteredMeetings.length;
  const totalCount = meetingsWithSessions.length;

  return {
    currentDate,
    view: effectiveView,
    selectedStatus,
    timePeriod,
    isLoading,
    meetingsWithSessions,
    calendarFilteredMeetings,
    listFilteredMeetings,
    loadMoreResult,
    statusCounts,
    filteredCount,
    totalCount,
    viewContainerRef,
    handlePrevious,
    handleNext,
    handleToday,
    handleDayClick,
    handleViewChange,
    handleStatusChange,
    handleTimePeriodChange,
    handleLoadMore,
    handleClearFilters,
  };
}
