import { PROJECT_DESCRIPTION_MAX_LENGTH } from "@/lib/constants/project-constants";
import { z } from "zod";

export const updateProjectSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
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

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

