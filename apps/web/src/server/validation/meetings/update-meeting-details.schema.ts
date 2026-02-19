import { z } from "zod";

export const updateMeetingDetailsSchema = z
  .object({
    calendarEventId: z.string().min(1, "Calendar event ID is required"),
    title: z.string().min(1, "If provided, title must be non-empty").optional(),
    start: z.coerce.date().optional(),
    end: z.coerce.date().optional(),
    addMeetLinkIfMissing: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.start !== undefined ||
      data.end !== undefined ||
      data.addMeetLinkIfMissing === true,
    { message: "At least one field to update is required" }
  );

export type UpdateMeetingDetailsInput = z.infer<
  typeof updateMeetingDetailsSchema
>;

