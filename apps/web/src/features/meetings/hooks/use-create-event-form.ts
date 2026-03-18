"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  createEventFormSchema,
  type CreateEventFormData,
} from "../lib/create-event-schema";
import { useCreateCalendarEvent } from "./use-create-calendar-event";
import { useCreateEventSubmit } from "./use-create-event-submit";
import { useEventDateTimeDefaults } from "./use-event-datetime-defaults";
import { useEventRecurrence } from "./use-event-recurrence";
import { useConnectedProviders } from "./use-connected-providers";
import { useNavigateToMeeting } from "./use-navigate-to-meeting";

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

  const { providers, isLoading: isLoadingProviders } = useConnectedProviders();

  // Default to the first connected provider; user can override when multiple are connected.
  const [selectedProvider, setSelectedProvider] = useState<
    "google" | "microsoft" | undefined
  >(undefined);

  // Once providers are loaded, pre-select the first available one.
  useEffect(() => {
    if (!isLoadingProviders && providers.length > 0 && !selectedProvider) {
      setSelectedProvider(providers[0]);
    }
  }, [isLoadingProviders, providers, selectedProvider]);

  const { navigateToMeeting, isNavigating } = useNavigateToMeeting();

  const { createEvent, isCreating } = useCreateCalendarEvent({
    onSuccess: (data) => {
      // Capture form values before reset for navigation
      const values = form.getValues();
      reset();
      onOpenChange(false);

      // Navigate to the meeting prep page
      const startDateTime = values.allDay
        ? new Date(`${values.startDate}T00:00:00`)
        : new Date(`${values.startDate}T${values.startTime || "00:00"}:00`);
      const endDateTime = values.allDay
        ? new Date(`${values.endDate}T23:59:59`)
        : new Date(`${values.endDate}T${values.endTime || "00:00"}:00`);

      navigateToMeeting({
        calendarEventId: data.eventId,
        title: values.title,
        scheduledStartAt: startDateTime.toISOString(),
        scheduledEndAt: endDateTime.toISOString(),
      });
    },
  });

  const { onSubmit } = useCreateEventSubmit({
    createEvent,
    buildRecurrenceRules,
    provider: providers.length > 1 ? selectedProvider : undefined,
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
    isNavigating,
    onSubmit: form.handleSubmit(onSubmit),
    handleCancel,
    // Provider selector
    providers,
    isLoadingProviders,
    selectedProvider,
    setSelectedProvider,
  };
}
