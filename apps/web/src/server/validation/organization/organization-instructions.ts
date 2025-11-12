import { z } from "zod";

export const createOrganizationInstructionsSchema = z.object({
  instructions: z
    .string()
    .min(1, "Instructions are required")
    .max(100000, "Instructions must be less than 100,000 characters"),
});

export type CreateOrganizationInstructionsInput = z.infer<
  typeof createOrganizationInstructionsSchema
>;

export const updateOrganizationInstructionsSchema = z.object({
  instructions: z
    .string()
    .min(1, "Instructions are required")
    .max(100000, "Instructions must be less than 100,000 characters"),
});

export type UpdateOrganizationInstructionsInput = z.infer<
  typeof updateOrganizationInstructionsSchema
>;

