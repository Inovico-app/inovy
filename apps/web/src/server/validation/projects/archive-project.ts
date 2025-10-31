import { z } from "zod";

export const archiveProjectSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
});

export type ArchiveProjectInput = z.infer<typeof archiveProjectSchema>;

