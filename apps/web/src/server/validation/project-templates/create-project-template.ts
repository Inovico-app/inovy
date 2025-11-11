import { z } from "zod";

export const createProjectTemplateSchema = z.object({
  projectId: z.string().uuid("Project ID must be a valid UUID"),
  instructions: z
    .string()
    .min(1, "Instructions cannot be empty")
    .max(50000, "Instructions cannot exceed 50,000 characters"),
});

export type CreateProjectTemplateInput = z.infer<
  typeof createProjectTemplateSchema
>;

