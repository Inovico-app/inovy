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
import { useTranslations } from "next-intl";
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
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
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

    if (result.data) {
      toast.success(t("eventCreatedSuccess"));
      setEventUrl(result.data.eventUrl);
    } else {
      toast.error(result.serverError || t("eventCreatedError"));
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
      <DialogTrigger render={<Button variant={variant} size={size} />}>
        <Calendar className="h-4 w-4" />
        {showLabel && <span className="ml-2">{t("addToCalendar")}</span>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createCalendarEvent")}</DialogTitle>
          <DialogDescription>
            {t("createCalendarEventDescription")}
          </DialogDescription>
        </DialogHeader>

        {!eventUrl ? (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("taskLabel")}</Label>
                <div className="text-sm text-muted-foreground font-medium">
                  {taskTitle}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">{t("eventDuration")}</Label>
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
                  {t("eventDurationDefault")}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                {tc("cancel")}
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("createEvent")}
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
                    {t("eventCreatedTitle")}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    {t("eventCreatedMessage")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <a
                      href={eventUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                  nativeButton={false}
                  className="gap-2"
                >
                  {t("openInGoogleCalendar")}
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>{tc("close")}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
