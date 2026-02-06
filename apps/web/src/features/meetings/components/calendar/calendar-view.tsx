"use client";

import { CalendarGrid } from "./calendar-grid";
import { CalendarHeader, type CalendarView } from "./calendar-header";
import { MeetingsList } from "../meetings/meetings-list";
import { matchMeetingsWithSessions, filterMeetingsByBotStatus, sortMeetingsChronologically } from "@/features/meetings/lib/calendar-utils";
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
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

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

const VIEW_STORAGE_KEY = "meetings-view-preference";

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
              <CalendarGrid
                currentDate={currentDate}
                meetings={meetingsWithSessions}
                onDayClick={handleDayClick}
              />
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
              {paginatedMeetings ? (
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
              ) : (
                // Fallback: use client-side pagination when server data isn't ready yet
                (() => {
                  const filtered = filterMeetingsByBotStatus(meetingsWithSessions, selectedStatus);
                  const sorted = sortMeetingsChronologically(filtered);
                  const pageSize = 20;
                  const offset = (currentPage - 1) * pageSize;
                  const clientPaginated = sorted.slice(offset, offset + pageSize);
                  const clientTotalPages = Math.ceil(sorted.length / pageSize);
                  
                  return (
                    <MeetingsList
                      meetings={clientPaginated}
                      allMeetings={meetingsWithSessions}
                      currentPage={currentPage}
                      totalPages={clientTotalPages}
                      total={sorted.length}
                      selectedStatus={selectedStatus}
                      onStatusChange={handleStatusChange}
                      onPageChange={handlePageChange}
                      onClearFilters={handleClearFilters}
                    />
                  );
                })()
              )}
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
