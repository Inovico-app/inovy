"use client";

import { Button } from "@/components/ui/button";
import type { CalendarView } from "@/features/meetings/lib/calendar-utils";
import {
  CalendarIcon,
  CalendarDaysIcon,
  BriefcaseIcon,
  ClockIcon,
  ListIcon,
} from "lucide-react";

interface CalendarViewToggleProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

const VIEW_OPTIONS: Array<{
  value: CalendarView;
  label: string;
  icon: React.ElementType;
}> = [
  { value: "day", label: "Day", icon: ClockIcon },
  { value: "work-week", label: "Work Week", icon: BriefcaseIcon },
  { value: "week", label: "Week", icon: CalendarDaysIcon },
  { value: "month", label: "Month", icon: CalendarIcon },
  { value: "list", label: "List", icon: ListIcon },
];

export function CalendarViewToggle({
  view,
  onViewChange,
}: CalendarViewToggleProps) {
  return (
    <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
      {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant={view === value ? "default" : "ghost"}
          size="sm"
          onClick={() => onViewChange(value)}
          className="gap-1.5 h-7 px-2.5 text-xs"
          aria-label={`${label} view`}
          aria-pressed={view === value}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">{label}</span>
        </Button>
      ))}
    </div>
  );
}
