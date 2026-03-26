"use client";

import { Button } from "@/components/ui/button";
import { ArrowUpRight, History } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TimePeriod } from "@/features/meetings/lib/calendar-utils";

interface MeetingsTimePeriodToggleProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
}

export function MeetingsTimePeriodToggle({
  value,
  onChange,
}: MeetingsTimePeriodToggleProps) {
  const t = useTranslations("meetings");

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label={t("timePeriod.ariaLabel")}
    >
      <Button
        variant={value === "upcoming" ? "default" : "outline"}
        size="sm"
        onClick={() => onChange("upcoming")}
        className="gap-1.5"
        aria-pressed={value === "upcoming"}
      >
        <ArrowUpRight className="h-3.5 w-3.5" />
        {t("timePeriod.upcoming")}
      </Button>
      <Button
        variant={value === "past" ? "default" : "outline"}
        size="sm"
        onClick={() => onChange("past")}
        className="gap-1.5"
        aria-pressed={value === "past"}
      >
        <History className="h-3.5 w-3.5" />
        {t("timePeriod.past")}
      </Button>
    </div>
  );
}
