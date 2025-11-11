import { z } from "zod";

export const updateProjectTemplateSchema = z.object({
  id: z.string().uuid("Template ID must be a valid UUID"),
  instructions: z
    .string()
    .min(1, "Instructions cannot be empty")
    .max(50000, "Instructions cannot exceed 50,000 characters"),
});

export type UpdateProjectTemplateInput = z.infer<
  typeof updateProjectTemplateSchema
>;

