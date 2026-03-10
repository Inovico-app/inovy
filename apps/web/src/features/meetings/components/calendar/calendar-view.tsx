"use client";

import type { MeetingWithSession } from "@/features/meetings/lib/calendar-utils";
import { useCalendarViewState } from "@/features/meetings/hooks/use-calendar-view-state";
import { AnimatePresence, motion } from "motion/react";
import { Suspense, useState } from "react";
import { MeetingDetailsModal } from "../meeting-details-modal";
import { MeetingsList } from "../meetings/meetings-list";
import { CalendarGrid } from "./calendar-grid";
import { CalendarHeader, type CalendarView } from "./calendar-header";
import type { MeetingBotStatusFilter } from "@/features/meetings/lib/calendar-utils";

interface CalendarViewProps {
  initialDate?: Date;
  selectedStatus?: MeetingBotStatusFilter;
}

export function CalendarViewComponent(props: CalendarViewProps) {
  return (
    <Suspense fallback={null}>
      <CalendarViewInner {...props} />
    </Suspense>
  );
}

function CalendarViewInner({
  initialDate = new Date(),
  selectedStatus: initialSelectedStatus = "all",
}: CalendarViewProps) {
  const [selectedMeeting, setSelectedMeeting] =
    useState<MeetingWithSession | null>(null);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);

  const {
    currentDate,
    view,
    selectedStatus,
    timePeriod,
    isLoading,
    meetingsWithSessions,
    calendarFilteredMeetings,
    loadMoreResult,
    statusCounts,
    filteredCount,
    totalCount,
    viewContainerRef,
    handlePreviousMonth,
    handleNextMonth,
    handleToday,
    handleDayClick,
    handleViewChange,
    handleStatusChange,
    handleTimePeriodChange,
    handleLoadMore,
    handleClearFilters,
  } = useCalendarViewState({ initialDate, initialSelectedStatus });

  const handleMeetingClick = (meeting: MeetingWithSession) => {
    setSelectedMeeting(meeting);
    setMeetingModalOpen(true);
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
