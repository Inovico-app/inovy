/**
 * Recurrence pattern types and RRULE generation utilities
 * Based on Google Calendar API recurrence format (RFC 5545)
 */

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type RecurrenceEndType = "never" | "on" | "after";

export type MonthlyRecurrenceType = "day-of-month" | "day-of-week";

export type WeekDay = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";

export interface RecurrencePattern {
  frequency: RecurrenceFrequency;
  interval: number; // Every N days/weeks/months/years
  endType: RecurrenceEndType;
  endDate?: Date; // For endType "on"
  count?: number; // For endType "after"
  weekDays?: WeekDay[]; // For weekly recurrence
  monthlyType?: MonthlyRecurrenceType; // For monthly recurrence
  monthlyDayOfWeek?: number; // 1-5 for first-fifth, -1 for last
  monthlyWeekDay?: WeekDay; // MO, TU, etc.
}

/**
 * Convert a Date to RRULE UNTIL format (YYYYMMDDTHHMMSSZ)
 */
function dateToRRuleUntil(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}T235959Z`;
}

/**
 * Get the day of week for a date (0=Sunday, 6=Saturday)
 */
function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Convert JavaScript day of week to RRULE weekday
 */
function jsWeekDayToRRule(day: number): WeekDay {
  const weekDays: WeekDay[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  return weekDays[day];
}

/**
 * Get the nth occurrence of a weekday in a month (e.g., "2nd Tuesday")
 */
function getNthWeekdayOfMonth(date: Date): number {
  const dayOfMonth = date.getDate();
  return Math.ceil(dayOfMonth / 7);
}

/**
 * Generate RRULE string from recurrence pattern
 * Returns array format expected by Google Calendar API
 */
export function generateRRule(
  pattern: RecurrencePattern,
  eventStartDate: Date
): string[] {
  const parts: string[] = [`FREQ=${pattern.frequency}`];

  // Add interval if not 1
  if (pattern.interval > 1) {
    parts.push(`INTERVAL=${pattern.interval}`);
  }

  // Add frequency-specific rules
  switch (pattern.frequency) {
    case "WEEKLY":
      if (pattern.weekDays && pattern.weekDays.length > 0) {
        parts.push(`BYDAY=${pattern.weekDays.join(",")}`);
      } else {
        // Default to the same day of week as the event start
        const dayOfWeek = getDayOfWeek(eventStartDate);
        const rruleDay = jsWeekDayToRRule(dayOfWeek);
        parts.push(`BYDAY=${rruleDay}`);
      }
      break;

    case "MONTHLY": {
      if (pattern.monthlyType === "day-of-week") {
        // e.g., "2nd Tuesday of every month"
        const nthWeekday = pattern.monthlyDayOfWeek ?? getNthWeekdayOfMonth(eventStartDate);
        const weekDay = pattern.monthlyWeekDay ?? jsWeekDayToRRule(getDayOfWeek(eventStartDate));
        parts.push(`BYDAY=${nthWeekday}${weekDay}`);
      } else {
        // Default: same day of month (e.g., "15th of every month")
        const dayOfMonth = eventStartDate.getDate();
        parts.push(`BYMONTHDAY=${dayOfMonth}`);
      }
      break;
    }

    case "YEARLY": {
      // Same date each year
      const month = eventStartDate.getMonth() + 1;
      const dayOfMonth = eventStartDate.getDate();
      parts.push(`BYMONTH=${month}`);
      parts.push(`BYMONTHDAY=${dayOfMonth}`);
      break;
    }
  }

  // Add end condition
  switch (pattern.endType) {
    case "on":
      if (pattern.endDate) {
        parts.push(`UNTIL=${dateToRRuleUntil(pattern.endDate)}`);
      }
      break;
    case "after":
      if (pattern.count && pattern.count > 0) {
        parts.push(`COUNT=${pattern.count}`);
      }
      break;
    // "never" - no end condition added
  }

  return [`RRULE:${parts.join(";")}`];
}

/**
 * Preset recurrence patterns
 */
export const RECURRENCE_PRESETS = {
  none: {
    label: "Does not repeat",
    value: "none" as const,
  },
  daily: {
    label: "Daily",
    value: "daily" as const,
    pattern: {
      frequency: "DAILY" as const,
      interval: 1,
      endType: "never" as const,
    },
  },
  weekdays: {
    label: "Every weekday (Monday to Friday)",
    value: "weekdays" as const,
    pattern: {
      frequency: "WEEKLY" as const,
      interval: 1,
      weekDays: ["MO", "TU", "WE", "TH", "FR"] as WeekDay[],
      endType: "never" as const,
    },
  },
  weekly: {
    label: "Weekly",
    value: "weekly" as const,
    pattern: {
      frequency: "WEEKLY" as const,
      interval: 1,
      endType: "never" as const,
    },
  },
  biweekly: {
    label: "Every 2 weeks",
    value: "biweekly" as const,
    pattern: {
      frequency: "WEEKLY" as const,
      interval: 2,
      endType: "never" as const,
    },
  },
  monthly: {
    label: "Monthly",
    value: "monthly" as const,
    pattern: {
      frequency: "MONTHLY" as const,
      interval: 1,
      monthlyType: "day-of-month" as const,
      endType: "never" as const,
    },
  },
  yearly: {
    label: "Annually",
    value: "yearly" as const,
    pattern: {
      frequency: "YEARLY" as const,
      interval: 1,
      endType: "never" as const,
    },
  },
  custom: {
    label: "Custom...",
    value: "custom" as const,
  },
} as const;

export type RecurrencePresetValue = typeof RECURRENCE_PRESETS[keyof typeof RECURRENCE_PRESETS]["value"];
