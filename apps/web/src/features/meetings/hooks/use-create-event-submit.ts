"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import type { CreateEventFormData } from "../lib/create-event-schema";

export interface CreateEventInput {
  title: string;
  startDateTime: Date;
  duration: number;
  description?: string;
  location?: string;
  calendarId: string;
  addBot: boolean;
  attendeeUserIds: string[];
  attendeeEmails: string[];
  allDay: boolean;
  startDate?: string;
  endDate?: string;
  recurrence?: string[];
  userTimezone: string;
}

interface UseCreateEventSubmitProps {
  createEvent: (input: CreateEventInput) => void;
  buildRecurrenceRules: (
    data: CreateEventFormData
  ) => string[] | null | undefined;
}

export function useCreateEventSubmit({
  createEvent,
  buildRecurrenceRules,
}: UseCreateEventSubmitProps) {
  const onSubmit = useCallback(
    (data: CreateEventFormData) => {
      const recurrenceResult = buildRecurrenceRules(data);
      if (recurrenceResult === null) return;

      const rruleArray = recurrenceResult;
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (data.allDay) {
        createEvent({
          title: data.title,
          startDateTime: new Date(`${data.startDate}T00:00:00`),
          duration: 1440,
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
          userTimezone,
        });
        return;
      }

      const start = new Date(
        `${data.startDate}T${data.startTime || "00:00"}:00`
      );
      const end = new Date(`${data.endDate}T${data.endTime || "00:00"}:00`);
      const calculatedDuration = Math.round(
        (end.getTime() - start.getTime()) / (60 * 1000)
      );

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
        userTimezone,
      });
    },
    [createEvent, buildRecurrenceRules]
  );

  return { onSubmit };
}

