"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MeetingBotStatus } from "@/features/meetings/lib/calendar-utils";
import { Badge } from "@/components/ui/badge";

interface MeetingsFilterProps {
  selectedStatus: MeetingBotStatus | "all";
  onStatusChange: (status: MeetingBotStatus | "all") => void;
  statusCounts?: Record<MeetingBotStatus | "all", number>;
}

const STATUS_OPTIONS: Array<{
  value: MeetingBotStatus | "all";
  label: string;
}> = [
  { value: "all", label: "All Meetings" },
  { value: "scheduled", label: "Scheduled" },
  { value: "joining", label: "Joining" },
  { value: "active", label: "Active" },
  { value: "leaving", label: "Leaving" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "pending_consent", label: "Pending Consent" },
  { value: "no_bot", label: "No Bot" },
];

export function MeetingsFilter({
  selectedStatus,
  onStatusChange,
  statusCounts,
}: MeetingsFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="bot-status-filter" className="text-sm font-medium">
        Filter by status:
      </label>
      <Select
        value={selectedStatus}
        onValueChange={(value) =>
          onStatusChange(value as MeetingBotStatus | "all")
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
    </div>
  );
}
