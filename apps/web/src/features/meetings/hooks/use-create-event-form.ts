"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  createEventFormSchema,
  type CreateEventFormData,
} from "../lib/create-event-schema";
import { useCreateCalendarEvent } from "./use-create-calendar-event";
import { useCreateEventSubmit } from "./use-create-event-submit";
import { useEventDateTimeDefaults } from "./use-event-datetime-defaults";
import { useEventRecurrence } from "./use-event-recurrence";

interface UseCreateEventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function useCreateEventForm({
  open,
  onOpenChange,
}: UseCreateEventFormProps) {
  const form = useForm<CreateEventFormData>({
    resolver: standardSchemaResolver(createEventFormSchema),
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

  const { setValue, watch, reset } = form;

  const addBot = watch("addBot");
  const allDay = watch("allDay");
  const startDate = watch("startDate");
  const startTime = watch("startTime");
  const endTime = watch("endTime");

  useEventDateTimeDefaults({ open, allDay, setValue, watch });

  const { recurrence, setRecurrence, resetRecurrence, buildRecurrenceRules } =
    useEventRecurrence();

  const { createEvent, isCreating } = useCreateCalendarEvent({
    onSuccess: () => {
      reset();
      onOpenChange(false);
    },
  });

  const { onSubmit } = useCreateEventSubmit({
    createEvent,
    buildRecurrenceRules,
  });

  useEffect(() => {
    if (!open) {
      reset();
      resetRecurrence();
    }
  }, [open, reset, resetRecurrence]);

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  return {
    form,
    addBot,
    allDay,
    startDate,
    startTime,
    endTime,
    recurrence,
    setRecurrence,
    isCreating,
    onSubmit: form.handleSubmit(onSubmit),
    handleCancel,
  };
}

