"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AttendeeSelector } from "./attendee-selector";
import { RecurrenceForm, type RecurrenceFormData } from "./recurrence-form";
import { useEventDateTimeDefaults } from "../hooks/use-event-datetime-defaults";
import { useCreateCalendarEvent } from "../hooks/use-create-calendar-event";
import { generateRRule, RECURRENCE_PRESETS, type RecurrencePattern } from "../lib/recurrence";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().optional(),
  endDate: z.string().min(1, "End date is required"),
  endTime: z.string().optional(),
  allDay: z.boolean(),
  location: z.string().optional(),
  description: z.string().optional(),
  addBot: z.boolean(),
  attendeeUserIds: z.array(z.string()),
  attendeeEmails: z.array(z.string().email()),
}).refine(
  (data) => {
    // If not all day, times must be provided
    if (!data.allDay) {
      return !!(data.startTime && data.endTime);
    }
    return true;
  },
  {
    message: "Start and end times are required when not all day",
    path: ["startTime"],
  }
).refine(
  (data) => {
    // End date must be after or equal to start date
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end < start) {
        return false;
      }
      // If same date and not all day, end time must be after start time
      if (end.getTime() === start.getTime() && !data.allDay && data.startTime && data.endTime) {
        const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
        const endDateTime = new Date(`${data.endDate}T${data.endTime}`);
        return endDateTime > startDateTime;
      }
    }
    return true;
  },
  {
    message: "End date/time must be after start date/time",
    path: ["endDate"],
  }
);

type FormData = z.infer<typeof formSchema>;

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


// Generate time options (every 15 minutes from 00:00 to 23:45)
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

export function CreateEventDialog({
  open,
  onOpenChange,
}: CreateEventDialogProps) {

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      title: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      allDay: false,
      location: "",
      description: "",
      addBot: true,
      attendeeUserIds: [],
      attendeeEmails: [],
    },
  });

  const addBot = watch("addBot");
  const allDay = watch("allDay");
  const startDate = watch("startDate");
  const startTime = watch("startTime");
  const endTime = watch("endTime");

  // Recurrence state
  const [recurrence, setRecurrence] = useState<RecurrenceFormData>({
    preset: "none",
    endType: "never",
  });

  // Handle date/time defaults
  useEventDateTimeDefaults({
    open,
    allDay,
    setValue,
    watch,
  });


  const { createEvent, isCreating } = useCreateCalendarEvent({
    onSuccess: () => {
      // Reset form and close dialog
      reset();
      onOpenChange(false);
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset();
      setRecurrence({
        preset: "none",
        endType: "never",
      });
    }
  }, [open, reset]);


  const onSubmit = async (data: FormData) => {
    // Generate recurrence RRULE if needed
    let rruleArray: string[] | undefined;
    
    if (recurrence.preset !== "none") {
      const startDateTime = data.allDay 
        ? new Date(`${data.startDate}T00:00:00`)
        : new Date(`${data.startDate}T${data.startTime || "00:00"}:00`);

      let pattern: RecurrencePattern;

      if (recurrence.preset === "custom") {
        // Build custom pattern
        pattern = {
          frequency: recurrence.customFrequency || "WEEKLY",
          interval: recurrence.customInterval || 1,
          endType: recurrence.endType,
          endDate: recurrence.endDate ? new Date(recurrence.endDate) : undefined,
          count: recurrence.count,
          weekDays: recurrence.weekDays,
          monthlyType: recurrence.monthlyType,
        };
      } else {
        // Use preset pattern
        const presetKey = recurrence.preset as keyof typeof RECURRENCE_PRESETS;
        const preset = RECURRENCE_PRESETS[presetKey];
        
        if ("pattern" in preset) {
          pattern = {
            ...preset.pattern,
            endType: recurrence.endType,
            endDate: recurrence.endDate ? new Date(recurrence.endDate) : undefined,
            count: recurrence.count,
          };
        } else {
          pattern = {
            frequency: "DAILY",
            interval: 1,
            endType: recurrence.endType,
          };
        }
      }

      rruleArray = generateRRule(pattern, startDateTime);
    }

    if (data.allDay) {
      // All day events: pass date strings directly
      createEvent({
        title: data.title,
        startDateTime: new Date(`${data.startDate}T00:00:00`),
        duration: 1440, // 24 hours in minutes
        description: data.description || undefined,
        location: data.location || undefined,
        calendarId: "primary",
        addBot: data.addBot,
        attendeeUserIds: data.attendeeUserIds || [],
        attendeeEmails: data.attendeeEmails || [],
        allDay: true,
        startDate: data.startDate,
        endDate: data.endDate,
        recurrence: rruleArray,
      });
    } else {
      // Timed events: combine date and time
      const start = new Date(`${data.startDate}T${data.startTime || "00:00"}:00`);
      const end = new Date(`${data.endDate}T${data.endTime || "00:00"}:00`);

      // Calculate duration in minutes
      const calculatedDuration = Math.round((end.getTime() - start.getTime()) / (60 * 1000));

      if (calculatedDuration < 15) {
        toast.error("Duration must be at least 15 minutes");
        return;
      }

      createEvent({
        title: data.title,
        startDateTime: start,
        duration: calculatedDuration,
        description: data.description || undefined,
        location: data.location || undefined,
        calendarId: "primary",
        addBot: data.addBot,
        attendeeUserIds: data.attendeeUserIds || [],
        attendeeEmails: data.attendeeEmails || [],
        allDay: false,
        recurrence: rruleArray,
      });
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Meeting title"
              aria-invalid={errors.title ? "true" : "false"}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Event description"
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startDate"
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
                <Label htmlFor="startTime">
                  Start Time {!allDay && <span className="text-destructive">*</span>}
                </Label>
                <Select
                  value={startTime || ""}
                  onValueChange={(value) => setValue("startTime", value)}
                  disabled={allDay}
                >
                  <SelectTrigger id="startTime" className="w-full">
                    <SelectValue placeholder={allDay ? "All day" : "Select time"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {TIME_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
                <Label htmlFor="endDate">
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  {...register("endDate")}
                  min={startDate || undefined}
                  aria-invalid={errors.endDate ? "true" : "false"}
                />
                {errors.endDate && (
                  <p className="text-sm text-destructive">
                    {errors.endDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">
                  End Time {!allDay && <span className="text-destructive">*</span>}
                </Label>
                <Select
                  value={endTime || ""}
                  onValueChange={(value) => setValue("endTime", value)}
                  disabled={allDay}
                >
                  <SelectTrigger id="endTime" className="w-full">
                    <SelectValue placeholder={allDay ? "All day" : "Select time"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {TIME_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allDay"
                checked={allDay}
                onCheckedChange={(checked) => setValue("allDay", checked === true)}
              />
              <Label
                htmlFor="allDay"
                className="text-sm font-normal cursor-pointer"
              >
                All day
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...register("location")}
              placeholder="Event location"
            />
          </div>

          <RecurrenceForm
            value={recurrence}
            onChange={setRecurrence}
            eventStartDate={startDate}
            disabled={isCreating}
          />

          <AttendeeSelector
            selectedUserIds={watch("attendeeUserIds") || []}
            selectedEmails={watch("attendeeEmails") || []}
            onUserIdsChange={(userIds) => setValue("attendeeUserIds", userIds)}
            onEmailsChange={(emails) => setValue("attendeeEmails", emails)}
            disabled={isCreating}
          />

          <div className="flex items-center space-x-2">
            <Checkbox
              id="addBot"
              checked={addBot}
              onCheckedChange={(checked) =>
                setValue("addBot", checked === true)
              }
            />
            <Label
              htmlFor="addBot"
              className="text-sm font-normal cursor-pointer"
            >
              Add bot to this meeting
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
