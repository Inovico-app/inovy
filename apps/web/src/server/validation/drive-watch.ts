import { z } from "zod";

/**
 * Validation schemas for Drive watch operations
 */

/**
 * Schema for starting a Drive watch
 */
export const startDriveWatchSchema = z.object({
  folderId: z.string().min(1, "Folder ID is required"),
  projectId: z.string().uuid("Project ID must be a valid UUID"),
});

export type StartDriveWatchInput = z.infer<typeof startDriveWatchSchema>;

/**
 * Schema for stopping a Drive watch
 */
export const stopDriveWatchSchema = z.object({
  folderId: z.string().min(1, "Folder ID is required"),
});

export type StopDriveWatchInput = z.infer<typeof stopDriveWatchSchema>;

/**
 * Schema for updating a Drive watch
 */
export const updateDriveWatchSchema = z.object({
  watchId: z.string().uuid("Watch ID must be a valid UUID"),
  projectId: z.string().uuid("Project ID must be a valid UUID"),
});

export type UpdateDriveWatchInput = z.infer<typeof updateDriveWatchSchema>;

/**
 * Schema for deleting a Drive watch
 */
export const deleteDriveWatchSchema = z.object({
  watchId: z.string().uuid("Watch ID must be a valid UUID"),
});

export type DeleteDriveWatchInput = z.infer<typeof deleteDriveWatchSchema>;

