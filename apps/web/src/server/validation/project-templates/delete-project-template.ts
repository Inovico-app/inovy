import { z } from "zod";

export const deleteProjectTemplateSchema = z.object({
  id: z.string().uuid("Template ID must be a valid UUID"),
});

export type DeleteProjectTemplateInput = z.infer<
  typeof deleteProjectTemplateSchema
>;

