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
import { useCallback, useEffect, useState } from "react";

interface AgentMetricsFiltersProps {
  initialStartDate: Date;
  initialEndDate: Date;
  initialOrganizationId?: string;
  initialUserId?: string;
  organizations: Array<{ id: string; name: string }>;
  users: Array<{ id: string; email: string; name: string | null }>;
  isSuperAdmin?: boolean;
}

const DATE_PRESETS = [
  { label: "Last Hour", hours: 1 },
  { label: "Last 24 Hours", hours: 24 },
  { label: "Last 7 Days", hours: 24 * 7 },
  { label: "Last 30 Days", hours: 24 * 30 },
] as const;

export function AgentMetricsFilters({
  initialStartDate,
  initialEndDate,
  initialOrganizationId: _initialOrganizationId,
  initialUserId,
  organizations,
  users,
  isSuperAdmin = false,
}: AgentMetricsFiltersProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(
    initialStartDate.toISOString().slice(0, 16)
  );
  const [endDate, setEndDate] = useState(
    initialEndDate.toISOString().slice(0, 16)
  );
  const [organizationId, setOrganizationId] = useQueryStates(
    {
      organizationId: parseAsString,
      userId: parseAsString,
    },
    {
      shallow: false,
    }
  );

  const [selectedUserId, setSelectedUserId] = useState(initialUserId ?? "");

  // Sync local state with URL on navigation
  useEffect(() => {
    if (organizationId.userId !== undefined) {
      setSelectedUserId(organizationId.userId ?? "");
    }
  }, [organizationId.userId]);

  // Update users when organization changes
  useEffect(() => {
    if (organizationId.organizationId) {
      setSelectedUserId("");
      router.refresh();
    }
  }, [organizationId.organizationId, router]);

  const handlePresetClick = useCallback((hours: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    setStartDate(start.toISOString().slice(0, 16));
    setEndDate(end.toISOString().slice(0, 16));
  }, []);

  const handleApply = useCallback(() => {
    const params = new URLSearchParams();
    params.set("startDate", new Date(startDate).toISOString());
    params.set("endDate", new Date(endDate).toISOString());
    if (organizationId.organizationId) {
      params.set("organizationId", organizationId.organizationId);
    }
    if (selectedUserId) {
      params.set("userId", selectedUserId);
    }
    const url = `/admin/agent-metrics?${params.toString()}` as Route;
    router.push(url);
  }, [
    startDate,
    endDate,
    organizationId.organizationId,
    selectedUserId,
    router,
  ]);

  const handleReset = useCallback(() => {
    setStartDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
    );
    setEndDate(new Date().toISOString().slice(0, 16));
    setOrganizationId({ organizationId: null, userId: null });
    setSelectedUserId("");
    router.push("/admin/agent-metrics" as Route);
  }, [router, setOrganizationId]);

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
              onClick={() => handlePresetClick(preset.hours)}
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

      {isSuperAdmin && (
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="organization" className="text-xs font-medium">
            Organization
          </Label>
          <Select
            value={organizationId.organizationId ?? "all"}
            onValueChange={(value) =>
              setOrganizationId({
                organizationId: value === "all" ? null : value,
              })
            }
          >
            <SelectTrigger id="organization" className="h-8 w-full text-xs">
              <SelectValue placeholder="All organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All organizations</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2 border-t pt-4">
        <Label htmlFor="user" className="text-xs font-medium">
          User
        </Label>
        <Select
          value={selectedUserId || "all"}
          onValueChange={(value) =>
            setSelectedUserId(value === "all" ? "" : value)
          }
          disabled={
            isSuperAdmin &&
            !organizationId.organizationId &&
            organizations.length > 0
          }
        >
          <SelectTrigger id="user" className="h-8 w-full text-xs">
            <SelectValue placeholder="All users" />
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

