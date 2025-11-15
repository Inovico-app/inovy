import { z } from "zod";

/**
 * Validation schemas for Team operations
 */

export const createTeamSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long"),
  description: z.string().max(1000, "Description is too long").nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name is too long").optional(),
  description: z.string().max(1000, "Description is too long").nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
});

export const assignUserToTeamSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  teamId: z.string().uuid("Team ID must be a valid UUID"),
  role: z.enum(["member", "lead", "admin"]).default("member"),
});

export const updateUserTeamRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  teamId: z.string().uuid("Team ID must be a valid UUID"),
  role: z.enum(["member", "lead", "admin"]),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type AssignUserToTeamInput = z.infer<typeof assignUserToTeamSchema>;
export type UpdateUserTeamRoleInput = z.infer<typeof updateUserTeamRoleSchema>;

