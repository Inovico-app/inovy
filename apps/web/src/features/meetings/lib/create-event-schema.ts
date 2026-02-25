import { z } from "zod";

export const createEventFormSchema = z
  .object({
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
  })
  .refine(
    (data) => {
      if (!data.allDay) {
        return !!(data.startTime && data.endTime);
      }
      return true;
    },
    {
      message: "Start and end times are required when not all day",
      path: ["startTime"],
    }
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (end < start) {
          return false;
        }
        if (
          end.getTime() === start.getTime() &&
          !data.allDay &&
          data.startTime &&
          data.endTime
        ) {
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

export type CreateEventFormData = z.infer<typeof createEventFormSchema>;

export const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
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
