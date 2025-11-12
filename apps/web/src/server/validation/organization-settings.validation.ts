import { z } from "zod";

/**
 * Validation schemas for organization settings operations
 */

export const updateOrganizationSettingsSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  instructions: z
    .string()
    .min(1, "Instructions cannot be empty")
    .max(100000, "Instructions cannot exceed 100,000 characters"),
});

export const createOrganizationSettingsSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  instructions: z
    .string()
    .min(1, "Instructions cannot be empty")
    .max(100000, "Instructions cannot exceed 100,000 characters"),
  createdById: z.string().min(1, "Created by ID is required"),
});

export type UpdateOrganizationSettingsInput = z.infer<
  typeof updateOrganizationSettingsSchema
>;
export type CreateOrganizationSettingsInput = z.infer<
  typeof createOrganizationSettingsSchema
>;

