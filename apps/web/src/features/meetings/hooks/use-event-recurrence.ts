"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { RecurrenceFormData } from "../components/recurrence-form";
import type { CreateEventFormData } from "../lib/create-event-schema";
import {
  generateRRule,
  RECURRENCE_PRESETS,
  type RecurrencePattern,
} from "../lib/recurrence";

const DEFAULT_RECURRENCE: RecurrenceFormData = {
  preset: "none",
  endType: "never",
};

export function useEventRecurrence() {
  const [recurrence, setRecurrence] =
    useState<RecurrenceFormData>(DEFAULT_RECURRENCE);

  const resetRecurrence = useCallback(() => {
    setRecurrence(DEFAULT_RECURRENCE);
  }, []);

  const buildRecurrenceRules = useCallback(
    (data: CreateEventFormData): string[] | undefined => {
      if (recurrence.preset === "none") return undefined;

      const startDateTime = data.allDay
        ? new Date(`${data.startDate}T00:00:00`)
        : new Date(`${data.startDate}T${data.startTime || "00:00"}:00`);

      let pattern: RecurrencePattern;

      if (recurrence.preset === "custom") {
        pattern = {
          frequency: recurrence.customFrequency || "WEEKLY",
          interval: recurrence.customInterval || 1,
          endType: recurrence.endType,
          endDate: recurrence.endDate
            ? new Date(recurrence.endDate)
            : undefined,
          count: recurrence.count,
          weekDays: recurrence.weekDays,
          monthlyType: recurrence.monthlyType,
        };
      } else {
        const presetKey = recurrence.preset as keyof typeof RECURRENCE_PRESETS;
        const preset = RECURRENCE_PRESETS[presetKey];
        if (!preset || !("pattern" in preset)) {
          throw new Error(
            `Unexpected preset ${String(presetKey)} without pattern`
          );
        }
        pattern = {
          ...preset.pattern,
          endType: recurrence.endType,
          endDate: recurrence.endDate
            ? new Date(recurrence.endDate)
            : undefined,
          count: recurrence.count,
        };
      }

      if (recurrence.endType === "on" && !recurrence.endDate?.trim()) {
        toast.error(
          "End date is required when recurrence ends on a specific date"
        );
        return undefined;
      }

      if (
        recurrence.endType === "after" &&
        (!recurrence.count ||
          !Number.isInteger(recurrence.count) ||
          recurrence.count <= 0)
      ) {
        toast.error(
          "A positive occurrence count is required when recurrence ends after a number of times"
        );
        return undefined;
      }

      return generateRRule(pattern, startDateTime);
    },
    [recurrence]
  );

  return {
    recurrence,
    setRecurrence,
    resetRecurrence,
    buildRecurrenceRules,
  };
}

