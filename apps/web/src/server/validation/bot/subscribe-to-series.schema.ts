import { z } from "zod";

export const subscribeToSeriesSchema = z.object({
  calendarEventId: z.string().min(1),
  calendarId: z.string().min(1),
  calendarProvider: z.enum(["google", "microsoft"]),
});
