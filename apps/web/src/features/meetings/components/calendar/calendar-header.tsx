"use client";

import { Button } from "@/components/ui/button";
import type {
  CalendarView,
  MeetingBotStatusFilter,
  TimePeriod,
} from "@/features/meetings/lib/calendar-utils";
import {
  formatDateRange,
  formatMonthYear,
  formatWeekRange,
  formatWorkWeekRange,
} from "@/features/meetings/lib/calendar-utils";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreateEventDialog } from "../create-event-dialog";
import { MeetingsFilter } from "../meetings/meetings-filter";
import { MeetingsTimePeriodToggle } from "../meetings/meetings-time-period-toggle";
import { CalendarViewToggle } from "./calendar-view-toggle";

export type { CalendarView };

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  selectedStatus: MeetingBotStatusFilter;
  onStatusChange: (status: MeetingBotStatusFilter) => void;
  statusCounts?: Record<MeetingBotStatusFilter, number>;
  filteredCount?: number;
  totalCount?: number;
  onClearFilters?: () => void;
  timePeriod?: TimePeriod;
  onTimePeriodChange?: (period: TimePeriod) => void;
  isMobile?: boolean;
}

function getHeading(date: Date, view: CalendarView): string {
  switch (view) {
    case "day":
      return format(date, "EEEE, MMMM d, yyyy");
    case "week":
      return formatWeekRange(date);
    case "work-week":
      return formatWorkWeekRange(date);
    case "month":
    case "list":
      return formatMonthYear(date);
  }
}

function getNavLabel(view: CalendarView): { prev: string; next: string } {
  switch (view) {
    case "day":
      return { prev: "Previous day", next: "Next day" };
    case "week":
    case "work-week":
      return { prev: "Previous week", next: "Next week" };
    case "month":
    case "list":
      return { prev: "Previous month", next: "Next month" };
  }
}

export function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  selectedStatus,
  onStatusChange,
  statusCounts,
  filteredCount,
  totalCount,
  onClearFilters,
  timePeriod = "upcoming",
  onTimePeriodChange,
  isMobile = false,
}: CalendarHeaderProps) {
  const t = useTranslations("meetings");
  const [dialogOpen, setDialogOpen] = useState(false);
  const navLabels = getNavLabel(view);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onToday}>
              {t("calendar.today")}
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={onPrevious}
                aria-label={navLabels.prev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onNext}
                aria-label={navLabels.next}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {getHeading(currentDate, view)}
              </h2>
              {view === "list" && (
                <p className="text-xs text-muted-foreground">
                  {formatDateRange(currentDate)}
                </p>
              )}
            </div>
          </div>
          {view === "list" && onTimePeriodChange && (
            <MeetingsTimePeriodToggle
              value={timePeriod}
              onChange={onTimePeriodChange}
            />
          )}
          <MeetingsFilter
            selectedStatus={selectedStatus}
            onStatusChange={onStatusChange}
            statusCounts={statusCounts}
            filteredCount={filteredCount}
            totalCount={totalCount}
            onClear={onClearFilters}
          />
        </div>

        <div className="flex items-center gap-2">
          {!isMobile && (
            <CalendarViewToggle view={view} onViewChange={onViewChange} />
          )}
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            aria-label={t("calendar.newEventAriaLabel")}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("calendar.newEvent")}
          </Button>
        </div>
      </div>

      <CreateEventDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
