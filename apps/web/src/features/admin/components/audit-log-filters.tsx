"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { useArrayToggle } from "@/hooks/use-array-toggle";

interface AuditLogFiltersProps {
  eventTypes: string[];
  onEventTypesChange: (eventTypes: string[]) => void;
  resourceTypes: string[];
  onResourceTypesChange: (resourceTypes: string[]) => void;
  actions: string[];
  onActionsChange: (actions: string[]) => void;
  userId?: string;
  onUserIdChange: (userId: string) => void;
  resourceId?: string;
  onResourceIdChange: (resourceId: string) => void;
  startDate?: string;
  onStartDateChange: (startDate: string) => void;
  endDate?: string;
  onEndDateChange: (endDate: string) => void;
  onClearFilters: () => void;
}

const EVENT_TYPE_OPTIONS = [
  { value: "recording_viewed", label: "Recording Viewed" },
  { value: "recording_downloaded", label: "Recording Downloaded" },
  { value: "recording_streamed", label: "Recording Streamed" },
  { value: "recording_uploaded", label: "Recording Uploaded" },
  { value: "recording_deleted", label: "Recording Deleted" },
  { value: "task_created", label: "Task Created" },
  { value: "task_updated", label: "Task Updated" },
  { value: "task_deleted", label: "Task Deleted" },
  { value: "user_login", label: "User Login" },
  { value: "user_logout", label: "User Logout" },
  { value: "permission_granted", label: "Permission Granted" },
  { value: "permission_revoked", label: "Permission Revoked" },
  { value: "export_created", label: "Export Created" },
  { value: "audit_log_exported", label: "Audit Log Exported" },
  { value: "integration_connected", label: "Integration Connected" },
  { value: "integration_disconnected", label: "Integration Disconnected" },
  { value: "project_created", label: "Project Created" },
  { value: "project_updated", label: "Project Updated" },
  { value: "project_deleted", label: "Project Deleted" },
];

const RESOURCE_TYPE_OPTIONS = [
  { value: "recording", label: "Recording" },
  { value: "task", label: "Task" },
  { value: "user", label: "User" },
  { value: "project", label: "Project" },
  { value: "organization", label: "Organization" },
  { value: "permission", label: "Permission" },
  { value: "role", label: "Role" },
  { value: "export", label: "Export" },
  { value: "integration", label: "Integration" },
  { value: "settings", label: "Settings" },
];

const ACTION_OPTIONS = [
  { value: "create", label: "Create" },
  { value: "read", label: "Read" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "export", label: "Export" },
  { value: "grant", label: "Grant" },
  { value: "revoke", label: "Revoke" },
];

export function AuditLogFilters({
  eventTypes,
  onEventTypesChange,
  resourceTypes,
  onResourceTypesChange,
  actions,
  onActionsChange,
  userId,
  onUserIdChange,
  resourceId,
  onResourceIdChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onClearFilters,
}: AuditLogFiltersProps) {
  const toggleEventType = useArrayToggle(eventTypes, onEventTypesChange);
  const toggleResourceType = useArrayToggle(
    resourceTypes,
    onResourceTypesChange
  );
  const toggleAction = useArrayToggle(actions, onActionsChange);

  const hasActiveFilters =
    eventTypes.length > 0 ||
    resourceTypes.length > 0 ||
    actions.length > 0 ||
    userId ||
    resourceId ||
    startDate ||
    endDate;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Filters</CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-8 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="event-type">Event Type</Label>
          <Select
            value={eventTypes[0] ?? ""}
            onValueChange={(value) => {
              if (value && !eventTypes.includes(value)) {
                onEventTypesChange([...eventTypes, value]);
              }
            }}
          >
            <SelectTrigger id="event-type">
              <SelectValue placeholder="Select event type" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {eventTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {eventTypes.map((type) => (
                <Button
                  key={type}
                  variant="secondary"
                  size="sm"
                  onClick={() => toggleEventType(type)}
                  className="h-7 text-xs"
                >
                  {EVENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ??
                    type}
                  <X className="h-3 w-3 ml-1" />
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="resource-type">Resource Type</Label>
          <Select
            value={resourceTypes[0] ?? ""}
            onValueChange={(value) => {
              if (value && !resourceTypes.includes(value)) {
                onResourceTypesChange([...resourceTypes, value]);
              }
            }}
          >
            <SelectTrigger id="resource-type">
              <SelectValue placeholder="Select resource type" />
            </SelectTrigger>
            <SelectContent>
              {RESOURCE_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {resourceTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {resourceTypes.map((type) => (
                <Button
                  key={type}
                  variant="secondary"
                  size="sm"
                  onClick={() => toggleResourceType(type)}
                  className="h-7 text-xs"
                >
                  {RESOURCE_TYPE_OPTIONS.find((o) => o.value === type)?.label ??
                    type}
                  <X className="h-3 w-3 ml-1" />
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="action">Action</Label>
          <Select
            value={actions[0] ?? ""}
            onValueChange={(value) => {
              if (value && !actions.includes(value)) {
                onActionsChange([...actions, value]);
              }
            }}
          >
            <SelectTrigger id="action">
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {actions.map((action) => (
                <Button
                  key={action}
                  variant="secondary"
                  size="sm"
                  onClick={() => toggleAction(action)}
                  className="h-7 text-xs"
                >
                  {ACTION_OPTIONS.find((o) => o.value === action)?.label ??
                    action}
                  <X className="h-3 w-3 ml-1" />
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-id">User ID</Label>
          <Input
            id="user-id"
            value={userId ?? ""}
            onChange={(e) => onUserIdChange(e.target.value)}
            placeholder="Filter by user ID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="resource-id">Resource ID</Label>
          <Input
            id="resource-id"
            value={resourceId ?? ""}
            onChange={(e) => onResourceIdChange(e.target.value)}
            placeholder="Filter by resource ID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="start-date">Start Date</Label>
          <Input
            id="start-date"
            type="datetime-local"
            value={startDate ?? ""}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end-date">End Date</Label>
          <Input
            id="end-date"
            type="datetime-local"
            value={endDate ?? ""}
            onChange={(e) => onEndDateChange(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

