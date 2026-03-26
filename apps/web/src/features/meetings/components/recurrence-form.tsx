"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  RECURRENCE_PRESETS,
  type MonthlyRecurrenceType,
  type RecurrenceEndType,
  type RecurrenceFrequency,
  type RecurrencePresetValue,
  type WeekDay,
} from "../lib/recurrence";

export interface RecurrenceFormData {
  preset: RecurrencePresetValue;
  customInterval?: number;
  customFrequency?: RecurrenceFrequency;
  weekDays?: WeekDay[];
  monthlyType?: MonthlyRecurrenceType;
  endType: RecurrenceEndType;
  endDate?: string;
  count?: number;
}

interface RecurrenceFormProps {
  value: RecurrenceFormData;
  onChange: (value: RecurrenceFormData) => void;
  eventStartDate: string;
  disabled?: boolean;
}

const WEEK_DAYS: Array<{ value: WeekDay; label: string; short: string }> = [
  { value: "MO", label: "Monday", short: "M" },
  { value: "TU", label: "Tuesday", short: "Tu" },
  { value: "WE", label: "Wednesday", short: "W" },
  { value: "TH", label: "Thursday", short: "Th" },
  { value: "FR", label: "Friday", short: "F" },
  { value: "SA", label: "Saturday", short: "Sa" },
  { value: "SU", label: "Sunday", short: "Su" },
];

const FREQUENCY_ITEMS = {
  DAILY: "day(s)",
  WEEKLY: "week(s)",
  MONTHLY: "month(s)",
  YEARLY: "year(s)",
};

export function RecurrenceForm({
  value,
  onChange,
  eventStartDate,
  disabled,
}: RecurrenceFormProps) {
  const t = useTranslations("meetings");
  const presetItems = useMemo(
    () =>
      Object.fromEntries(
        Object.values(RECURRENCE_PRESETS).map((p) => [p.value, p.label]),
      ),
    [],
  );

  const isCustom = value.preset === "custom";
  const showWeekDays = isCustom && value.customFrequency === "WEEKLY";
  const showMonthlyOptions = isCustom && value.customFrequency === "MONTHLY";

  const handlePresetChange = (preset: RecurrencePresetValue) => {
    if (preset === "none") {
      onChange({
        preset: "none",
        endType: "never",
      });
    } else if (preset === "custom") {
      onChange({
        preset: "custom",
        customInterval: 1,
        customFrequency: "WEEKLY",
        endType: "never",
      });
    } else {
      onChange({
        preset,
        endType: "never",
      });
    }
  };

  const handleCustomIntervalChange = (interval: string) => {
    if (interval === "") {
      onChange({ ...value, customInterval: undefined });
      return;
    }
    const num = parseInt(interval, 10);
    if (!isNaN(num) && num > 0) {
      onChange({ ...value, customInterval: num });
    }
  };

  const handleWeekDayToggle = (day: WeekDay) => {
    const currentDays = value.weekDays || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];
    onChange({ ...value, weekDays: newDays });
  };

  const handleEndTypeChange = (endType: RecurrenceEndType) => {
    onChange({ ...value, endType });
  };

  const handleEndDateChange = (dateStr: string) => {
    onChange({ ...value, endDate: dateStr });
  };

  const handleCountChange = (countStr: string) => {
    if (countStr === "") {
      onChange({ ...value, count: undefined });
      return;
    }
    const num = parseInt(countStr, 10);
    if (!isNaN(num) && num > 0) {
      onChange({ ...value, count: num });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="recurrence-preset">{t("recurrence.repeat")}</Label>
        <Select
          value={value.preset}
          onValueChange={(val) =>
            handlePresetChange(val as RecurrencePresetValue)
          }
          disabled={disabled}
          items={presetItems}
        >
          <SelectTrigger id="recurrence-preset">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RECURRENCE_PRESETS).map(([key, preset]) => (
              <SelectItem key={key} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isCustom && (
        <div className="space-y-4 p-4 border rounded-md bg-muted/30">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="custom-interval">
                {t("recurrence.repeatEvery")}
              </Label>
              <Input
                id="custom-interval"
                type="number"
                min="1"
                max="99"
                value={value.customInterval ?? ""}
                onChange={(e) => handleCustomIntervalChange(e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-frequency">
                {t("recurrence.frequency")}
              </Label>
              <Select
                value={value.customFrequency || "WEEKLY"}
                onValueChange={(freq) =>
                  onChange({
                    ...value,
                    customFrequency: freq as RecurrenceFrequency,
                  })
                }
                disabled={disabled}
                items={FREQUENCY_ITEMS}
              >
                <SelectTrigger id="custom-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">day(s)</SelectItem>
                  <SelectItem value="WEEKLY">week(s)</SelectItem>
                  <SelectItem value="MONTHLY">month(s)</SelectItem>
                  <SelectItem value="YEARLY">year(s)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {showWeekDays && (
            <div className="space-y-2">
              <Label>{t("recurrence.repeatOn")}</Label>
              <div className="flex gap-2">
                {WEEK_DAYS.map((day) => {
                  const isSelected =
                    value.weekDays?.includes(day.value) || false;
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleWeekDayToggle(day.value)}
                      disabled={disabled}
                      className={`
                        flex items-center justify-center w-10 h-10 rounded-full
                        font-medium text-sm transition-colors
                        ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        }
                        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                      `}
                      aria-label={day.label}
                      title={day.label}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showMonthlyOptions && (
            <div className="space-y-2">
              <Label>{t("recurrence.monthlyRepeatType")}</Label>
              <RadioGroup
                value={value.monthlyType || "day-of-month"}
                onValueChange={(val) =>
                  onChange({
                    ...value,
                    monthlyType: val as MonthlyRecurrenceType,
                  })
                }
                disabled={disabled}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="day-of-month" id="day-of-month" />
                  <Label
                    htmlFor="day-of-month"
                    className="font-normal cursor-pointer"
                  >
                    {t("recurrence.sameDayOfMonth")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="day-of-week" id="day-of-week" />
                  <Label
                    htmlFor="day-of-week"
                    className="font-normal cursor-pointer"
                  >
                    {t("recurrence.sameWeekday")}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>
      )}

      {value.preset !== "none" && (
        <div className="space-y-4 p-4 border rounded-md bg-muted/30">
          <Label>{t("recurrence.ends")}</Label>
          <RadioGroup
            value={value.endType}
            onValueChange={(val) =>
              handleEndTypeChange(val as RecurrenceEndType)
            }
            disabled={disabled}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="never" id="end-never" />
              <Label htmlFor="end-never" className="font-normal cursor-pointer">
                {t("recurrence.never")}
              </Label>
            </div>

            <div className="flex items-center space-x-2 gap-2">
              <RadioGroupItem value="on" id="end-on" />
              <Label htmlFor="end-on" className="font-normal cursor-pointer">
                {t("recurrence.on")}
              </Label>
              <Input
                type="date"
                value={value.endDate || ""}
                onChange={(e) => handleEndDateChange(e.target.value)}
                disabled={disabled || value.endType !== "on"}
                className="w-48"
                min={eventStartDate}
              />
            </div>

            <div className="flex items-center space-x-2 gap-2">
              <RadioGroupItem value="after" id="end-after" />
              <Label htmlFor="end-after" className="font-normal cursor-pointer">
                {t("recurrence.after")}
              </Label>
              <Input
                type="number"
                min="1"
                max="999"
                value={value.count ?? ""}
                onChange={(e) => handleCountChange(e.target.value)}
                disabled={disabled || value.endType !== "after"}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                {t("recurrence.occurrences")}
              </span>
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  );
}
