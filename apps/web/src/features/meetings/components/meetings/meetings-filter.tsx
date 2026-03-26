"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MeetingBotStatusFilter } from "@/features/meetings/lib/calendar-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

interface MeetingsFilterProps {
  selectedStatus: MeetingBotStatusFilter;
  onStatusChange: (status: MeetingBotStatusFilter) => void;
  statusCounts?: Record<MeetingBotStatusFilter, number>;
  filteredCount?: number;
  totalCount?: number;
  onClear?: () => void;
}

const STATUS_OPTION_KEYS: Array<{
  value: MeetingBotStatusFilter;
  labelKey: string;
}> = [
  { value: "all", labelKey: "filter.allMeetings" },
  { value: "with_bot", labelKey: "filter.withBot" },
  { value: "without_bot", labelKey: "filter.withoutBot" },
  { value: "active", labelKey: "filter.active" },
  { value: "failed", labelKey: "filter.failed" },
];

export function MeetingsFilter({
  selectedStatus,
  onStatusChange,
  statusCounts,
  filteredCount,
  totalCount,
  onClear,
}: MeetingsFilterProps) {
  const t = useTranslations("meetings");

  const statusOptions = useMemo(
    () =>
      STATUS_OPTION_KEYS.map((o) => ({
        value: o.value,
        label: t(o.labelKey as Parameters<typeof t>[0]),
      })),
    [t],
  );

  const statusItems = useMemo(
    () => Object.fromEntries(statusOptions.map((o) => [o.value, o.label])),
    [statusOptions],
  );

  const isFiltered = selectedStatus !== "all";
  const showCount =
    isFiltered &&
    filteredCount !== undefined &&
    totalCount !== undefined &&
    totalCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="bot-status-filter" className="text-sm font-medium">
        {t("filter.label")}
      </label>
      <Select
        value={selectedStatus}
        onValueChange={(value) =>
          onStatusChange(value as MeetingBotStatusFilter)
        }
        items={statusItems}
      >
        <SelectTrigger id="bot-status-filter" className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => {
            const count = statusCounts?.[option.value];
            return (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center justify-between w-full">
                  <span>{option.label}</span>
                  {count !== undefined && (
                    <Badge variant="outline" className="ml-2">
                      {count}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {isFiltered && onClear && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          aria-label={t("filter.clearFilter")}
          className="h-8 px-2"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {showCount && (
        <span
          className="text-sm text-muted-foreground"
          aria-live="polite"
          aria-atomic="true"
        >
          {t("filter.showingOf", {
            filtered: filteredCount,
            total: totalCount,
          })}
        </span>
      )}
    </div>
  );
}
