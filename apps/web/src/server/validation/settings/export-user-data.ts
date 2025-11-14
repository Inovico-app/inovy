import { z } from "zod";

export const exportUserDataSchema = z.object({
  dateRange: z
    .object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
    })
    .optional(),
  projectId: z.string().uuid().optional(),
});

export type ExportUserDataInput = z.infer<typeof exportUserDataSchema>;

