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

interface MeetingsFilterProps {
  selectedStatus: MeetingBotStatusFilter;
  onStatusChange: (status: MeetingBotStatusFilter) => void;
  statusCounts?: Record<MeetingBotStatusFilter, number>;
  filteredCount?: number;
  totalCount?: number;
  onClear?: () => void;
}

const STATUS_OPTIONS: Array<{
  value: MeetingBotStatusFilter;
  label: string;
}> = [
  { value: "all", label: "All Meetings" },
  { value: "with_bot", label: "With Bot" },
  { value: "without_bot", label: "Without Bot" },
  { value: "pending_consent", label: "Pending Consent" },
  { value: "active", label: "Active" },
  { value: "failed", label: "Failed" },
];

export function MeetingsFilter({
  selectedStatus,
  onStatusChange,
  statusCounts,
  filteredCount,
  totalCount,
  onClear,
}: MeetingsFilterProps) {
  const isFiltered = selectedStatus !== "all";
  const showCount =
    isFiltered &&
    filteredCount !== undefined &&
    totalCount !== undefined &&
    totalCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="bot-status-filter" className="text-sm font-medium">
        Filter by status:
      </label>
      <Select
        value={selectedStatus}
        onValueChange={(value) =>
          onStatusChange(value as MeetingBotStatusFilter)
        }
      >
        <SelectTrigger id="bot-status-filter" className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => {
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
          aria-label="Clear filter"
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
          Showing {filteredCount} of {totalCount} meetings
        </span>
      )}
    </div>
  );
}
