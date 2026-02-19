"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { format } from "date-fns";
import { ExternalLinkIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { BotStatusBadge } from "@/features/bot/components/bot-status-badge";
import { AddBotConsentDialog } from "./add-bot-consent-dialog";
import { useAddBotToMeeting } from "../hooks/use-add-bot-to-meeting";
import { useRemoveBotFromMeeting } from "../hooks/use-remove-bot-from-meeting";
import { useUpdateBotSessionMeetingUrl } from "../hooks/use-update-bot-session-meeting-url";
import { useUpdateBotSessionProject } from "../hooks/use-update-bot-session-project";
import { useUpdateMeetingDetails } from "../hooks/use-update-meeting-details";
import {
  formatMeetingDuration,
  formatTimeRange,
  getAttendeesCount,
} from "../lib/calendar-utils";
import type { MeetingWithSession } from "../lib/calendar-utils";
import { getUserProjects } from "@/features/projects/actions/get-user-projects";
import { useQuery } from "@tanstack/react-query";

const EDITABLE_BOT_STATUSES = ["scheduled", "failed"] as const;

const meetingDetailsFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.string().min(1, "End date is required"),
  endTime: z.string().min(1, "End time is required"),
});

type MeetingDetailsFormData = z.infer<typeof meetingDetailsFormSchema>;

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  const date = new Date(`2000-01-01T${timeString}`);
  const formatted = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return { value: timeString, label: formatted };
});

function formatDateForInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function formatTimeForInput(date: Date): string {
  return format(date, "HH:mm");
}

interface MeetingDetailsModalProps {
  meeting: MeetingWithSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MeetingDetailsModal({
  meeting,
  open,
  onOpenChange,
  onSuccess,
}: MeetingDetailsModalProps) {
  const [botMeetingUrl, setBotMeetingUrl] = useState("");
  const [isConsentDialogOpen, setIsConsentDialogOpen] = useState(false);

  const { updateMeetingDetails, isUpdating } = useUpdateMeetingDetails({
    onSuccess,
  });
  const { updateMeetingUrl, isUpdating: isUpdatingUrl } =
    useUpdateBotSessionMeetingUrl({
    onSuccess,
  });
  const { updateProject, isUpdating: isUpdatingProject } =
    useUpdateBotSessionProject({
    onSuccess,
  });
  const { execute: removeBot, isExecuting: isRemovingBot } =
    useRemoveBotFromMeeting({
      onSuccess: () => {
        onOpenChange(false);
        onSuccess?.();
      },
    });
  const { execute: addBot, isExecuting: isAddingBot } = useAddBotToMeeting({
    onConsentRequired: () => setIsConsentDialogOpen(true),
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ["user-projects"],
    queryFn: async () => {
      const result = await getUserProjects();
      if (!result.success || !result.data) return [];
      return result.data;
    },
    enabled: open && !!meeting?.botSession,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MeetingDetailsFormData>({
    resolver: standardSchemaResolver(meetingDetailsFormSchema),
    values: meeting
      ? {
          title: meeting.title || "",
          startDate: formatDateForInput(new Date(meeting.start)),
          startTime: formatTimeForInput(new Date(meeting.start)),
          endDate: formatDateForInput(new Date(meeting.end)),
          endTime: formatTimeForInput(new Date(meeting.end)),
        }
      : undefined,
  });

  const startDate = watch("startDate");
  const botSession = meeting?.botSession;

  useEffect(() => {
    if (botSession?.meetingUrl) {
      setBotMeetingUrl(botSession.meetingUrl);
    } else {
      setBotMeetingUrl("");
    }
  }, [botSession?.meetingUrl, open]);
  const canEditBot =
    botSession &&
    EDITABLE_BOT_STATUSES.includes(
      botSession.botStatus as (typeof EDITABLE_BOT_STATUSES)[number]
    );
  const isUpcoming = meeting ? meeting.start > new Date() : false;
  const hasMeetingUrl =
    meeting?.meetingUrl?.trim() &&
    meeting.meetingUrl.includes("meet.google.com");

  const handleMeetingDetailsSubmit = (data: MeetingDetailsFormData) => {
    if (!meeting) return;

    const start = new Date(`${data.startDate}T${data.startTime}:00`);
    const end = new Date(`${data.endDate}T${data.endTime}:00`);
    const durationMinutes = Math.round(
      (end.getTime() - start.getTime()) / (60 * 1000)
    );

    if (durationMinutes < 15) {
      toast.error("Duration must be at least 15 minutes");
      return;
    }

    updateMeetingDetails({
      calendarEventId: meeting.id,
      title: data.title,
      start,
      end,
    });
  };

  const handleBotMeetingUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!botSession || !botMeetingUrl.trim()) return;

    const trimmed = botMeetingUrl.trim();
    try {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      if (url.hostname !== "meet.google.com") {
        toast.error("Meeting URL must be a Google Meet link");
        return;
      }
    } catch {
      toast.error("Invalid meeting URL");
      return;
    }

    updateMeetingUrl({
      sessionId: botSession.id,
      meetingUrl: trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    });
  };

  const handleAddBot = () => {
    if (!meeting) return;
    addBot({
      calendarEventId: meeting.id,
      meetingUrl: meeting.meetingUrl,
      meetingTitle: meeting.title,
      consentGiven: false,
    });
  };

  const handleConsentAccept = () => {
    if (!meeting) return;
    addBot({
      calendarEventId: meeting.id,
      meetingUrl: meeting.meetingUrl,
      meetingTitle: meeting.title,
      consentGiven: true,
    });
    setIsConsentDialogOpen(false);
  };

  if (!meeting) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Meeting Details</DialogTitle>
            <DialogDescription>No meeting selected</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <AddBotConsentDialog
        open={isConsentDialogOpen}
        onOpenChange={(open) => {
          setIsConsentDialogOpen(open);
        }}
        onAccept={handleConsentAccept}
        meetingTitle={meeting.title}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-describedby="meeting-details-description"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {meeting.title || "Untitled Meeting"}
              {botSession && (
                <BotStatusBadge
                  status={botSession.botStatus}
                  error={botSession.error}
                />
              )}
            </DialogTitle>
            <DialogDescription id="meeting-details-description">
              View and edit meeting details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Section 1: Meeting Details */}
            <section aria-labelledby="meeting-details-heading">
              <h3
                id="meeting-details-heading"
                className="font-semibold mb-3"
              >
                Meeting Details
              </h3>
              <form
                onSubmit={handleSubmit(handleMeetingDetailsSubmit)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="meeting-title">Title</Label>
                  <Input
                    id="meeting-title"
                    {...register("title")}
                    placeholder="Meeting title"
                    aria-invalid={errors.title ? "true" : "false"}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      {...register("startDate")}
                      aria-invalid={errors.startDate ? "true" : "false"}
                    />
                    {errors.startDate && (
                      <p className="text-sm text-destructive">
                        {errors.startDate.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time</Label>
                    <Select
                      value={watch("startTime")}
                      onValueChange={(v) => setValue("startTime", v)}
                    >
                      <SelectTrigger id="start-time">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.startTime && (
                      <p className="text-sm text-destructive">
                        {errors.startTime.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      {...register("endDate")}
                      min={startDate}
                      aria-invalid={errors.endDate ? "true" : "false"}
                    />
                    {errors.endDate && (
                      <p className="text-sm text-destructive">
                        {errors.endDate.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Select
                      value={watch("endTime")}
                      onValueChange={(v) => setValue("endTime", v)}
                    >
                      <SelectTrigger id="end-time">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.endTime && (
                      <p className="text-sm text-destructive">
                        {errors.endTime.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Duration:{" "}
                  {formatMeetingDuration(
                    new Date(meeting.start),
                    new Date(meeting.end)
                  )}
                  {meeting.attendees && meeting.attendees.length > 0 && (
                    <span className="ml-2">
                      • {getAttendeesCount(meeting)} attendee
                      {getAttendeesCount(meeting) !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Meeting URL</Label>
                  <a
                    href={
                      meeting.meetingUrl.startsWith("http")
                        ? meeting.meetingUrl
                        : `https://${meeting.meetingUrl}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    {meeting.meetingUrl}
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </a>
                </div>

                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Meeting Details"
                  )}
                </Button>
              </form>
            </section>

            {/* Section 2: Bot Details (if bot exists) */}
            {botSession && (
              <>
                <Separator />
                <section aria-labelledby="bot-details-heading">
                  <h3 id="bot-details-heading" className="font-semibold mb-3">
                    Bot Details
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Status:
                      </span>
                      <BotStatusBadge
                        status={botSession.botStatus}
                        error={botSession.error}
                      />
                    </div>

                    {canEditBot && (
                      <>
                        <form
                          onSubmit={handleBotMeetingUrlSubmit}
                          className="space-y-2"
                        >
                          <Label htmlFor="bot-meeting-url">
                            Bot Meeting URL
                          </Label>
                          <Input
                            id="bot-meeting-url"
                            type="url"
                            placeholder="https://meet.google.com/..."
                            value={botMeetingUrl}
                            onChange={(e) =>
                              setBotMeetingUrl(e.target.value)
                            }
                            className="font-mono text-sm"
                          />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            disabled={
                              isUpdatingUrl ||
                              !botMeetingUrl.trim() ||
                              botMeetingUrl.trim() === botSession.meetingUrl
                            }
                          >
                            {isUpdatingUrl ? (
                              <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Update URL"
                            )}
                          </Button>
                        </form>

                        <div className="space-y-2">
                          <Label htmlFor="bot-project">Project</Label>
                          <Select
                            defaultValue={botSession.projectId}
                            onValueChange={(projectId) =>
                              updateProject({
                                sessionId: botSession.id,
                                projectId,
                              })
                            }
                            disabled={isUpdatingProject || isLoadingProjects}
                          >
                            <SelectTrigger id="bot-project">
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        removeBot({ sessionId: botSession.id })
                      }
                      disabled={isRemovingBot}
                    >
                      {isRemovingBot ? (
                        <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2Icon className="h-4 w-4 mr-2" />
                      )}
                      Remove Bot
                    </Button>
                  </div>
                </section>
              </>
            )}

            {/* Section 3: Add Bot (if no bot) */}
            {!botSession && isUpcoming && hasMeetingUrl && (
              <>
                <Separator />
                <section aria-labelledby="add-bot-heading">
                  <h3 id="add-bot-heading" className="font-semibold mb-3">
                    Add Bot
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Add a recording bot to join this meeting when it starts.
                  </p>
                  <Button
                    onClick={handleAddBot}
                    disabled={isAddingBot}
                  >
                    {isAddingBot ? (
                      <>
                        <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Bot to Meeting"
                    )}
                  </Button>
                </section>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
