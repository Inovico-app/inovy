"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useArrayToggle } from "@/hooks/use-array-toggle";
import { X } from "lucide-react";

interface AuditLogFiltersProps {
  category: string;
  onCategoryChange: (category: string) => void;
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

const CATEGORY_OPTIONS = [
  { value: "mutation", label: "Mutations" },
  { value: "read", label: "Reads" },
  { value: "all", label: "All" },
] as const;

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
  { value: "meeting", label: "Meeting" },
  { value: "bot_session", label: "Bot Session" },
  { value: "bot_settings", label: "Bot Settings" },
  { value: "bot_subscription", label: "Bot Subscription" },
  { value: "notification", label: "Notification" },
  { value: "team", label: "Team" },
  { value: "onboarding", label: "Onboarding" },
  { value: "auto_action", label: "Auto Action" },
  { value: "agenda", label: "Agenda" },
  { value: "agenda_template", label: "Agenda Template" },
  { value: "share_token", label: "Share Token" },
  { value: "drive_watch", label: "Drive Watch" },
  { value: "knowledge_base_document", label: "Knowledge Base Document" },
  { value: "project_template", label: "Project Template" },
  { value: "redaction", label: "Redaction" },
  { value: "privacy_request", label: "Privacy Request" },
  { value: "data_export", label: "Data Export" },
  { value: "invitation", label: "Invitation" },
  { value: "calendar", label: "Calendar" },
  { value: "audit_log", label: "Audit Log" },
  { value: "blob", label: "Blob" },
  { value: "consent", label: "Consent" },
  { value: "knowledge_base", label: "Knowledge Base" },
  { value: "chat", label: "Chat" },
];

const ACTION_OPTIONS = [
  { value: "create", label: "Create" },
  { value: "read", label: "Read" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "export", label: "Export" },
  { value: "grant", label: "Grant" },
  { value: "revoke", label: "Revoke" },
  { value: "start", label: "Start" },
  { value: "cancel", label: "Cancel" },
  { value: "retry", label: "Retry" },
  { value: "subscribe", label: "Subscribe" },
  { value: "unsubscribe", label: "Unsubscribe" },
  { value: "complete", label: "Complete" },
  { value: "uncomplete", label: "Uncomplete" },
  { value: "move", label: "Move" },
  { value: "reprocess", label: "Reprocess" },
  { value: "upload", label: "Upload" },
  { value: "download", label: "Download" },
  { value: "redact", label: "Redact" },
  { value: "invite", label: "Invite" },
  { value: "accept", label: "Accept" },
  { value: "reject", label: "Reject" },
  { value: "mark_read", label: "Mark Read" },
  { value: "generate", label: "Generate" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "verify", label: "Verify" },
  { value: "reset", label: "Reset" },
  { value: "list", label: "List" },
  { value: "get", label: "Get" },
  { value: "search", label: "Search" },
  { value: "detect", label: "Detect" },
  { value: "apply", label: "Apply" },
  { value: "check", label: "Check" },
  { value: "import", label: "Import" },
  { value: "archive", label: "Archive" },
  { value: "restore", label: "Restore" },
  { value: "assign", label: "Assign" },
  { value: "unassign", label: "Unassign" },
  { value: "connect", label: "Connect" },
  { value: "disconnect", label: "Disconnect" },
  { value: "sync", label: "Sync" },
];

const EVENT_TYPE_ITEMS = Object.fromEntries(
  EVENT_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

const RESOURCE_TYPE_ITEMS = Object.fromEntries(
  RESOURCE_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

const ACTION_ITEMS = Object.fromEntries(
  ACTION_OPTIONS.map((o) => [o.value, o.label]),
);

export function AuditLogFilters({
  category,
  onCategoryChange,
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
    onResourceTypesChange,
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
          <Label>Category</Label>
          <div className="flex rounded-md border border-input overflow-hidden">
            {CATEGORY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onCategoryChange(option.value)}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  category === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground hover:bg-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="event-type">Event Type</Label>
          <Select
            value={eventTypes[0] ?? ""}
            onValueChange={(value) => {
              if (value && !eventTypes.includes(value)) {
                onEventTypesChange([...eventTypes, value]);
              }
            }}
            items={EVENT_TYPE_ITEMS}
          >
            <SelectTrigger id="event-type" className="w-full">
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
            items={RESOURCE_TYPE_ITEMS}
          >
            <SelectTrigger id="resource-type" className="w-full">
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
            items={ACTION_ITEMS}
          >
            <SelectTrigger id="action" className="w-full">
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
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="resource-id">Resource ID</Label>
          <Input
            id="resource-id"
            value={resourceId ?? ""}
            onChange={(e) => onResourceIdChange(e.target.value)}
            placeholder="Filter by resource ID"
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="start-date">Start Date</Label>
          <Input
            id="start-date"
            type="datetime-local"
            value={startDate ?? ""}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end-date">End Date</Label>
          <Input
            id="end-date"
            type="datetime-local"
            value={endDate ?? ""}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}
