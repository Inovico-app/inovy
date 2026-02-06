"use client";

import { Button } from "@/components/ui/button";
import { Calendar, List } from "lucide-react";
import type { CalendarView } from "./calendar-header";

interface CalendarViewToggleProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

export function CalendarViewToggle({
  view,
  onViewChange,
}: CalendarViewToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant={view === "month" ? "default" : "outline"}
        size="sm"
        onClick={() => onViewChange("month")}
        className={view !== "month" ? "gap-2 cursor-pointer" : "gap-2"}
        aria-label="Calendar view"
        aria-pressed={view === "month"}
      >
        <Calendar className="h-4 w-4" />
        Calendar
      </Button>
      <Button
        variant={view === "list" ? "default" : "outline"}
        size="sm"
        onClick={() => onViewChange("list")}
        className={view !== "list" ? "gap-2 cursor-pointer" : "gap-2"}
        aria-label="List view"
        aria-pressed={view === "list"}
      >
        <List className="h-4 w-4" />
        List
      </Button>
    </div>
  );
}
