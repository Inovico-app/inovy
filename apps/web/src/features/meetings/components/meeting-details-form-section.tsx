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
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { format } from "date-fns";
import { ExternalLinkIcon, Loader2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import type { MeetingWithSession } from "../lib/calendar-utils";
import {
  formatMeetingDuration,
  getAttendeesCount,
} from "../lib/calendar-utils";

const meetingDetailsFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.string().min(1, "End date is required"),
  endTime: z.string().min(1, "End time is required"),
});

export type MeetingDetailsFormData = z.infer<typeof meetingDetailsFormSchema>;

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

function DurationAndAttendeesDisplay({
  meeting,
  startDate,
  startTime,
  endDate,
  endTime,
}: {
  meeting: MeetingWithSession;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}) {
  const start =
    startDate && startTime
      ? new Date(`${startDate}T${startTime}:00`)
      : meeting.start;
  const end =
    endDate && endTime ? new Date(`${endDate}T${endTime}:00`) : meeting.end;
  const duration = formatMeetingDuration(start, end);
  const attendeeCount = getAttendeesCount(meeting);
  return (
    <>
      Duration: {duration}
      {attendeeCount > 0 && (
        <span className="ml-2">
          • {attendeeCount} attendee{attendeeCount !== 1 ? "s" : ""}
        </span>
      )}
    </>
  );
}

interface MeetingDetailsFormSectionProps {
  meeting: MeetingWithSession;
  onSubmit: (data: MeetingDetailsFormData) => void;
  isUpdating: boolean;
}

export function MeetingDetailsFormSection({
  meeting,
  onSubmit,
  isUpdating,
}: MeetingDetailsFormSectionProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MeetingDetailsFormData>({
    resolver: standardSchemaResolver(meetingDetailsFormSchema),
    values: {
      title: meeting.title || "",
      startDate: formatDateForInput(new Date(meeting.start)),
      startTime: formatTimeForInput(new Date(meeting.start)),
      endDate: formatDateForInput(new Date(meeting.end)),
      endTime: formatTimeForInput(new Date(meeting.end)),
    },
  });

  const startDate = watch("startDate");

  const handleFormSubmit = (data: MeetingDetailsFormData) => {
    const start = new Date(`${data.startDate}T${data.startTime}:00`);
    const end = new Date(`${data.endDate}T${data.endTime}:00`);
    const durationMinutes = Math.round(
      (end.getTime() - start.getTime()) / (60 * 1000)
    );

    if (durationMinutes < 15) {
      toast.error("Duration must be at least 15 minutes");
      return;
    }

    onSubmit(data);
  };

  return (
    <section aria-labelledby="meeting-details-heading">
      <h3 id="meeting-details-heading" className="font-semibold mb-3">
        Meeting Details
      </h3>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
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
          <DurationAndAttendeesDisplay
            meeting={meeting}
            startDate={watch("startDate")}
            startTime={watch("startTime")}
            endDate={watch("endDate")}
            endTime={watch("endTime")}
          />
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
  );
}
