"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryStates } from "nuqs";
import { useCallback, useState } from "react";

interface UserAnalyticsFiltersProps {
  initialStartDate: Date;
  initialEndDate: Date;
  initialUserId?: string;
  users: Array<{ id: string; email: string; name: string | null }>;
}

const DATE_PRESETS = [
  { label: "Last 7 Days", days: 7 },
  { label: "Last 30 Days", days: 30 },
  { label: "Last 90 Days", days: 90 },
  { label: "Last Year", days: 365 },
] as const;

export function UserAnalyticsFilters({
  initialStartDate,
  initialEndDate,
  initialUserId,
  users,
}: UserAnalyticsFiltersProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(
    initialStartDate.toISOString().slice(0, 16)
  );
  const [endDate, setEndDate] = useState(
    initialEndDate.toISOString().slice(0, 16)
  );
  const [userId, setUserId] = useQueryStates(
    {
      userId: parseAsString,
    },
    {
      shallow: false,
    }
  );

  const [selectedUserId, setSelectedUserId] = useState(initialUserId ?? "");

  const handlePresetClick = useCallback((days: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    setStartDate(start.toISOString().slice(0, 16));
    setEndDate(end.toISOString().slice(0, 16));
  }, []);

  const handleApply = useCallback(() => {
    const params = new URLSearchParams();
    params.set("startDate", new Date(startDate).toISOString());
    params.set("endDate", new Date(endDate).toISOString());
    if (selectedUserId) {
      params.set("userId", selectedUserId);
    }
    const url = `/admin/agent-analytics?${params.toString()}` as Route;
    router.push(url);
  }, [startDate, endDate, selectedUserId, router]);

  const handleReset = useCallback(() => {
    setStartDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
    );
    setEndDate(new Date().toISOString().slice(0, 16));
    setUserId({ userId: null });
    setSelectedUserId("");
    router.push("/admin/agent-analytics" as Route);
  }, [router, setUserId]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Quick Date Range</h3>
        <div className="flex flex-col gap-1.5">
          {DATE_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => handlePresetClick(preset.days)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <div className="space-y-2">
          <Label htmlFor="start-date" className="text-xs font-medium">
            Start Date
          </Label>
          <Input
            id="start-date"
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={endDate}
            className="h-8 w-full text-xs"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-date" className="text-xs font-medium">
            End Date
          </Label>
          <Input
            id="end-date"
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            max={new Date().toISOString().slice(0, 16)}
            className="h-8 w-full text-xs"
          />
        </div>
      </div>

      {users.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="user" className="text-xs font-medium">
            User
          </Label>
          <Select
            value={selectedUserId || "all"}
            onValueChange={(value) =>
              setSelectedUserId(value === "all" ? "" : value)
            }
          >
            <SelectTrigger id="user" className="h-8 w-full text-xs">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t pt-4">
        <Button onClick={handleApply} size="sm" className="w-full text-xs">
          Apply
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          size="sm"
          className="w-full text-xs"
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

