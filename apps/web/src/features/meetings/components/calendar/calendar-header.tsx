"use client";

import { Button } from "@/components/ui/button";
import { formatMonthYear } from "@/features/meetings/lib/calendar-utils";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { CalendarViewToggle } from "./calendar-view-toggle";

export type CalendarView = "month" | "week" | "day" | "list";

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

export function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onPreviousMonth,
  onNextMonth,
  onToday,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        {view !== "list" && (
          <>
            <Button variant="outline" size="sm" onClick={onToday}>
              Today
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={onPreviousMonth}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onNextMonth}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-xl font-semibold">{formatMonthYear(currentDate)}</h2>
          </>
        )}
        {view === "list" && (
          <h2 className="text-xl font-semibold">Meetings List</h2>
        )}
      </div>

      <div className="flex items-center gap-2">
        <CalendarViewToggle view={view} onViewChange={onViewChange} />
        <Button size="sm" disabled aria-label="New event">
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </div>
    </div>
  );
}
