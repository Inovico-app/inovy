import z from "zod";

/**
 * Input validation schema for creating a project
 */
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be less than 100 characters"),
  description: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

