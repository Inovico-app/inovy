import { PROJECT_DESCRIPTION_MAX_LENGTH } from "@/lib/constants/project-constants";
import z from "zod";

/**
 * Input validation schema for creating a project
 */
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be less than 100 characters"),
  description: z
    .string()
    .max(
      PROJECT_DESCRIPTION_MAX_LENGTH,
      `Description must be less than ${PROJECT_DESCRIPTION_MAX_LENGTH} characters`
    )
    .optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

