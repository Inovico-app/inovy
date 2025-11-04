"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { createCalendarEvent } from "../actions/create-calendar-event";

interface CreateCalendarEventButtonProps {
  taskId: string;
  taskTitle: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function CreateCalendarEventButton({
  taskId,
  taskTitle,
  variant = "outline",
  size = "sm",
  showLabel = true,
}: CreateCalendarEventButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(30);
  const [eventUrl, setEventUrl] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);

    const result = await createCalendarEvent({
      taskId,
      duration,
    });

    if (result.success && result.data) {
      toast.success("Calendar event created successfully!");
      setEventUrl(result.data.eventUrl);
    } else {
      toast.error(result.error || "Failed to create calendar event");
    }

    setLoading(false);
  }

  function handleClose() {
    setOpen(false);
    setEventUrl(null);
    setDuration(30);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Calendar className="h-4 w-4" />
          {showLabel && <span className="ml-2">Add to Calendar</span>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Calendar Event</DialogTitle>
          <DialogDescription>
            Create a Google Calendar event for this task
          </DialogDescription>
        </DialogHeader>

        {!eventUrl ? (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Task</Label>
                <div className="text-sm text-muted-foreground font-medium">
                  {taskTitle}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Event Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Default: 30 minutes (15 min to 8 hours)
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Event
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="py-4">
              <div className="rounded-lg border bg-green-50 dark:bg-green-950 p-4 text-center space-y-3">
                <div className="flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Event Created Successfully!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    The calendar event has been added to your Google Calendar
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-2"
                >
                  <a
                    href={eventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Google Calendar
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

