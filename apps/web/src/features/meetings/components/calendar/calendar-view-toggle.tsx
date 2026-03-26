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
import { useTranslations } from "next-intl";

interface CalendarViewToggleProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

const VIEW_OPTIONS: Array<{
  value: CalendarView;
  labelKey: string;
  icon: React.ElementType;
}> = [
  { value: "day", labelKey: "calendar.dayView", icon: ClockIcon },
  {
    value: "work-week",
    labelKey: "calendar.workWeekView",
    icon: BriefcaseIcon,
  },
  { value: "week", labelKey: "calendar.weekView", icon: CalendarDaysIcon },
  { value: "month", labelKey: "calendar.monthView", icon: CalendarIcon },
  { value: "list", labelKey: "calendar.listView", icon: ListIcon },
];

export function CalendarViewToggle({
  view,
  onViewChange,
}: CalendarViewToggleProps) {
  const t = useTranslations("meetings");

  return (
    <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
      {VIEW_OPTIONS.map(({ value, labelKey, icon: Icon }) => {
        const label = t(labelKey as Parameters<typeof t>[0]);
        return (
          <Button
            key={value}
            variant={view === value ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewChange(value)}
            className="gap-1.5 h-7 px-2.5 text-xs"
            aria-label={t("calendar.viewAriaLabel", { label })}
            aria-pressed={view === value}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">{label}</span>
          </Button>
        );
      })}
    </div>
  );
}
