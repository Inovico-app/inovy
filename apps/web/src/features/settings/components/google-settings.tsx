"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  getGoogleSettings,
  updateGoogleSettings,
  resetGoogleSettings,
} from "../actions/google-settings";
import type { IntegrationSettings } from "@/server/db/schema/integration-settings";

interface GoogleSettingsProps {
  projectId?: string;
}

export function GoogleSettings({ projectId }: GoogleSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);

  // Form state
  const [autoCalendarEnabled, setAutoCalendarEnabled] = useState(false);
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(false);
  const [defaultEventDuration, setDefaultEventDuration] = useState(30);
  const [priorityFilter, setPriorityFilter] = useState<{
    low: boolean;
    medium: boolean;
    high: boolean;
    urgent: boolean;
  }>({
    low: false,
    medium: false,
    high: false,
    urgent: false,
  });

  useEffect(() => {
    loadSettings();
  }, [projectId]);

  async function loadSettings() {
    setLoading(true);

    const result = await getGoogleSettings(projectId ? { projectId } : undefined);

    if (result.data) {
      setSettings(result.data);
      setAutoCalendarEnabled(result.data.autoCalendarEnabled);
      setAutoEmailEnabled(result.data.autoEmailEnabled);
      setDefaultEventDuration(result.data.defaultEventDuration);

      // Load priority filter
      if (result.data.taskPriorityFilter) {
        setPriorityFilter({
          low: result.data.taskPriorityFilter.includes("low"),
          medium: result.data.taskPriorityFilter.includes("medium"),
          high: result.data.taskPriorityFilter.includes("high"),
          urgent: result.data.taskPriorityFilter.includes("urgent"),
        });
      } else {
        // All enabled by default if null
        setPriorityFilter({
          low: true,
          medium: true,
          high: true,
          urgent: true,
        });
      }
    } else {
      toast.error(result.serverError || "Failed to load settings");
    }

    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);

    // Build priority filter array
    const priorities: Array<"low" | "medium" | "high" | "urgent"> = [];
    if (priorityFilter.low) priorities.push("low");
    if (priorityFilter.medium) priorities.push("medium");
    if (priorityFilter.high) priorities.push("high");
    if (priorityFilter.urgent) priorities.push("urgent");

    const result = await updateGoogleSettings({
      projectId,
      autoCalendarEnabled,
      autoEmailEnabled,
      defaultEventDuration,
      taskPriorityFilter: priorities.length > 0 ? priorities : undefined,
    });

    if (result.data) {
      toast.success("Settings saved successfully!");
      setSettings(result.data);
    } else {
      toast.error(result.serverError || "Failed to save settings");
    }

    setSaving(false);
  }

  async function handleReset() {
    if (!confirm("Reset all settings to defaults?")) {
      return;
    }

    setSaving(true);

    const result = await resetGoogleSettings(projectId ? { projectId } : undefined);

    if (result.data) {
      toast.success("Settings reset to defaults");
      await loadSettings();
    } else {
      toast.error(result.serverError || "Failed to reset settings");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google Integration Settings</CardTitle>
          <CardDescription>
            Configure automatic actions for calendar and email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Integration Settings</CardTitle>
        <CardDescription>
          {projectId
            ? "Configure automatic actions for this project"
            : "Configure global automatic actions"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto Calendar Events */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-calendar"
              checked={autoCalendarEnabled}
              onCheckedChange={(checked) =>
                setAutoCalendarEnabled(checked === true)
              }
            />
            <Label htmlFor="auto-calendar" className="font-medium cursor-pointer">
              Automatically create calendar events from tasks
            </Label>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            When enabled, tasks extracted from recordings will automatically
            create Google Calendar events
          </p>
        </div>

        {/* Auto Email Drafts */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-email"
              checked={autoEmailEnabled}
              onCheckedChange={(checked) =>
                setAutoEmailEnabled(checked === true)
              }
            />
            <Label htmlFor="auto-email" className="font-medium cursor-pointer">
              Automatically create email drafts from summaries
            </Label>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            When enabled, recording summaries will automatically create Gmail
            drafts
          </p>
        </div>

        {/* Event Duration */}
        <div className="space-y-2">
          <Label htmlFor="duration">Default Calendar Event Duration</Label>
          <div className="flex items-center gap-2">
            <Input
              id="duration"
              type="number"
              min={15}
              max={480}
              step={15}
              value={defaultEventDuration}
              onChange={(e) =>
                setDefaultEventDuration(parseInt(e.target.value) || 30)
              }
              className="max-w-[150px]"
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Default duration for auto-created calendar events (15 min to 8 hours)
          </p>
        </div>

        {/* Priority Filter */}
        <div className="space-y-3">
          <Label>Task Priority Filter</Label>
          <p className="text-sm text-muted-foreground">
            Only create automatic actions for tasks with these priorities:
          </p>
          <div className="space-y-2 ml-2">
            {(["low", "medium", "high", "urgent"] as const).map((priority) => (
              <div key={priority} className="flex items-center space-x-2">
                <Checkbox
                  id={`priority-${priority}`}
                  checked={priorityFilter[priority]}
                  onCheckedChange={(checked) =>
                    setPriorityFilter((prev) => ({
                      ...prev,
                      [priority]: checked === true,
                    }))
                  }
                />
                <Label
                  htmlFor={`priority-${priority}`}
                  className="cursor-pointer capitalize"
                >
                  {priority}
                </Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            If none selected, all priorities will trigger actions
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

