import { z } from "zod";

export const driveWatchFormSchema = z.object({
  folderId: z.string().trim().min(1, "Folder ID is required"),
  projectId: z.string().min(1, "Project is required"),
});

export type DriveWatchFormValues = z.infer<typeof driveWatchFormSchema>;
