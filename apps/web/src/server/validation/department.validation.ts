import { z } from "zod";

/**
 * Validation schemas for Department operations
 */

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  description: z.string().max(1000, "Description is too long").nullish(),
  parentDepartmentId: z.string().uuid().nullish(),
});

export const updateDepartmentSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name is too long")
    .optional(),
  description: z.string().max(1000, "Description is too long").nullish(),
  parentDepartmentId: z.string().uuid().nullish(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

