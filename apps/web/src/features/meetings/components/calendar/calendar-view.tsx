"use client";

import { useIsMobile } from "@/hooks/use-media-query";
import type {
  CalendarView,
  MeetingWithSession,
} from "@/features/meetings/lib/calendar-utils";
import { getVisibleDates } from "@/features/meetings/lib/calendar-utils";
import { useCalendarViewState } from "@/features/meetings/hooks/use-calendar-view-state";
import { useTranslations } from "next-intl";
import { AnimatePresence, m } from "motion/react";
import { Suspense, useMemo, useState } from "react";
import { MeetingDetailsModal } from "../meeting-details-modal";
import { MeetingsList } from "../meetings/meetings-list";
import { CalendarGrid } from "./calendar-grid";
import { CalendarHeader } from "./calendar-header";
import { CalendarTimeGrid } from "./calendar-time-grid";
import type { MeetingBotStatusFilter } from "@/features/meetings/lib/calendar-utils";

const VIEW_TRANSITION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

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

function isTimeGridView(view: CalendarView): boolean {
  return view === "day" || view === "week" || view === "work-week";
}

function CalendarViewInner({
  initialDate = new Date(),
  selectedStatus: initialSelectedStatus = "all",
}: CalendarViewProps) {
  const t = useTranslations("meetings");
  const isMobile = useIsMobile();
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
    handlePrevious,
    handleNext,
    handleToday,
    handleDayClick,
    handleViewChange,
    handleStatusChange,
    handleTimePeriodChange,
    handleLoadMore,
    handleClearFilters,
  } = useCalendarViewState({ initialDate, initialSelectedStatus, isMobile });

  const effectiveView = view;

  const handleMeetingClick = (meeting: MeetingWithSession) => {
    setSelectedMeeting(meeting);
    setMeetingModalOpen(true);
  };

  // Compute dates for time-grid views
  const timeGridDates = useMemo(() => {
    if (!isTimeGridView(effectiveView)) return [];
    return getVisibleDates(currentDate, effectiveView);
  }, [effectiveView, currentDate]);

  const loadingPlaceholder = (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="rounded-lg border bg-card p-8 text-center text-muted-foreground"
    >
      <span className="sr-only">{t("page.loadingCalendar")}</span>
      {t("page.loadingCalendar")}
    </div>
  );

  return (
    <div className="space-y-4">
      <CalendarHeader
        currentDate={currentDate}
        view={effectiveView}
        onViewChange={handleViewChange}
        isMobile={isMobile}
        onPrevious={handlePrevious}
        onNext={handleNext}
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
          {effectiveView === "month" && (
            <m.div key="month-view" {...VIEW_TRANSITION}>
              {isLoading ? (
                loadingPlaceholder
              ) : (
                <CalendarGrid
                  currentDate={currentDate}
                  meetings={calendarFilteredMeetings}
                  onDayClick={handleDayClick}
                  onMeetingClick={handleMeetingClick}
                />
              )}
            </m.div>
          )}

          {effectiveView === "list" && (
            <m.div key="list-view" {...VIEW_TRANSITION}>
              {isLoading ? (
                loadingPlaceholder
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
            </m.div>
          )}

          {isTimeGridView(effectiveView) && (
            <m.div key={`${effectiveView}-view`} {...VIEW_TRANSITION}>
              {isLoading ? (
                loadingPlaceholder
              ) : (
                <CalendarTimeGrid
                  dates={timeGridDates}
                  meetings={calendarFilteredMeetings}
                  onMeetingClick={handleMeetingClick}
                />
              )}
            </m.div>
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
