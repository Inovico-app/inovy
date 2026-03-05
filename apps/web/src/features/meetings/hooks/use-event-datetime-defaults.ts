"use client";

import { useEffect } from "react";
import type { UseFormSetValue, UseFormWatch, FieldValues, Path } from "react-hook-form";

interface UseEventDateTimeDefaultsProps<T extends FieldValues> {
  open: boolean;
  allDay: boolean;
  setValue: UseFormSetValue<T>;
  watch: UseFormWatch<T>;
  startDatePath?: Path<T>;
  startTimePath?: Path<T>;
  endDatePath?: Path<T>;
  endTimePath?: Path<T>;
}

/**
 * Hook to manage default date/time values for event creation
 */
export function useEventDateTimeDefaults<T extends FieldValues>({
  open,
  allDay,
  setValue,
  watch,
  startDatePath = "startDate" as Path<T>,
  startTimePath = "startTime" as Path<T>,
  endDatePath = "endDate" as Path<T>,
  endTimePath = "endTime" as Path<T>,
}: UseEventDateTimeDefaultsProps<T>) {
  const startDate = watch(startDatePath) as string | undefined;
  const startTime = watch(startTimePath) as string | undefined;
  const endDate = watch(endDatePath) as string | undefined;
  const endTime = watch(endTimePath) as string | undefined;

  // Get default date (today)
  const getDefaultDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  // Get default time (current time + 1 hour, rounded to nearest 15 minutes)
  const getDefaultTime = () => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const roundedMinutes = Math.ceil(oneHourLater.getMinutes() / 15) * 15;
    oneHourLater.setMinutes(roundedMinutes);
    oneHourLater.setSeconds(0);
    oneHourLater.setMilliseconds(0);
    return oneHourLater.toTimeString().slice(0, 5); // HH:mm format
  };

  // Set default values when dialog opens
  useEffect(() => {
    if (open && !startDate) {
      const defaultDate = getDefaultDate();
      const defaultTime = getDefaultTime();
      setValue(startDatePath, defaultDate as unknown as T[Path<T>]);
      setValue(endDatePath, defaultDate as unknown as T[Path<T>]);
      if (!allDay) {
        setValue(startTimePath, defaultTime as unknown as T[Path<T>]);
        // Set end time to start time + 30 minutes
        const [hours, minutes] = defaultTime.split(":").map(Number);
        const endTimeDate = new Date();
        endTimeDate.setHours(hours, minutes + 30, 0, 0);
        const endTimeValue = endTimeDate.toTimeString().slice(0, 5);
        setValue(endTimePath, endTimeValue as unknown as T[Path<T>]);
      }
    }
  }, [open, setValue, startDate, allDay, startDatePath, endDatePath, startTimePath, endTimePath]);

  // When all day is toggled, clear or set times
  useEffect(() => {
    if (allDay) {
      setValue(startTimePath, "" as unknown as T[Path<T>]);
      setValue(endTimePath, "" as unknown as T[Path<T>]);
    } else if (!startTime || !endTime) {
      // Set default times if not all day and times are empty
      const defaultTime = getDefaultTime();
      setValue(startTimePath, defaultTime as unknown as T[Path<T>]);
      const [hours, minutes] = defaultTime.split(":").map(Number);
      const endTimeDate = new Date();
      endTimeDate.setHours(hours, minutes + 30, 0, 0);
      const endTimeValue = endTimeDate.toTimeString().slice(0, 5);
      setValue(endTimePath, endTimeValue as unknown as T[Path<T>]);
    }
  }, [allDay, setValue, startTime, endTime, startTimePath, endTimePath]);

  // Sync end date with start date when start date changes (if end date is before start date)
  useEffect(() => {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setValue(endDatePath, startDate as unknown as T[Path<T>]);
    }
  }, [startDate, endDate, setValue, endDatePath]);
}
