"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader } from "@/components/loader";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { exportAuditLogs } from "../actions/export-audit-logs";
import { AuditLogFilters } from "./audit-log-filters";
import { useState } from "react";
import { toast } from "sonner";

interface AuditLogViewerProps {
  initialFilters?: {
    eventType?: string[];
    resourceType?: string[];
    action?: string[];
    userId?: string;
    resourceId?: string;
    startDate?: string;
    endDate?: string;
  };
}

export function AuditLogViewer({ initialFilters }: AuditLogViewerProps) {
  const [eventTypes, setEventTypes] = useState<string[]>(
    initialFilters?.eventType ?? []
  );
  const [resourceTypes, setResourceTypes] = useState<string[]>(
    initialFilters?.resourceType ?? []
  );
  const [actions, setActions] = useState<string[]>(
    initialFilters?.action ?? []
  );
  const [userId, setUserId] = useState<string | undefined>(
    initialFilters?.userId
  );
  const [resourceId, setResourceId] = useState<string | undefined>(
    initialFilters?.resourceId
  );
  const [startDate, setStartDate] = useState<string | undefined>(
    initialFilters?.startDate
  );
  const [endDate, setEndDate] = useState<string | undefined>(
    initialFilters?.endDate
  );

  const filters = {
    eventType: eventTypes.length > 0 ? eventTypes : undefined,
    resourceType: resourceTypes.length > 0 ? resourceTypes : undefined,
    action: actions.length > 0 ? actions : undefined,
    userId,
    resourceId,
    startDate: startDate ? new Date(startDate).toISOString() : undefined,
    endDate: endDate ? new Date(endDate).toISOString() : undefined,
    limit: 100,
    offset: 0,
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.eventType) params.set("eventType", filters.eventType.join(","));
      if (filters.resourceType) params.set("resourceType", filters.resourceType.join(","));
      if (filters.action) params.set("action", filters.action.join(","));
      if (filters.resourceId) params.set("resourceId", filters.resourceId);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      params.set("limit", String(filters.limit ?? 100));
      params.set("offset", String(filters.offset ?? 0));

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Failed to fetch audit logs");
      }
      return response.json();
    },
  });

  const handleClearFilters = () => {
    setEventTypes([]);
    setResourceTypes([]);
    setActions([]);
    setUserId(undefined);
    setResourceId(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      const result = await exportAuditLogs({
        format,
        eventType: eventTypes.length > 0 ? eventTypes : undefined,
        resourceType: resourceTypes.length > 0 ? resourceTypes : undefined,
        action: actions.length > 0 ? actions : undefined,
        userId,
        resourceId,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Failed to export audit logs");
      }

      const { content, filename } = result.data;
      const blob = new Blob([content], {
        type: format === "csv" ? "text/csv" : "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Audit logs exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Failed to export audit logs");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <Loader />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">
            Failed to load audit logs. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <AuditLogFilters
          eventTypes={eventTypes}
          onEventTypesChange={setEventTypes}
          resourceTypes={resourceTypes}
          onResourceTypesChange={setResourceTypes}
          actions={actions}
          onActionsChange={setActions}
          userId={userId}
          onUserIdChange={setUserId}
          resourceId={resourceId}
          onResourceIdChange={setResourceId}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          onClearFilters={handleClearFilters}
        />
      </div>

      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>
                  {total} total log{total !== 1 ? "s" : ""} found
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("csv")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("json")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No audit logs found matching your filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-muted">
                      <th className="text-left py-3 px-4 font-semibold">
                        Timestamp
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Event Type
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Resource
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        Action
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        User ID
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">
                        IP Address
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-muted hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {log.eventType}
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">
                              {log.resourceType}
                            </span>
                            {log.resourceId && (
                              <code className="text-xs text-muted-foreground">
                                {log.resourceId.slice(0, 8)}...
                              </code>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-xs">
                            {log.userId.slice(0, 8)}...
                          </code>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {log.ipAddress ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

