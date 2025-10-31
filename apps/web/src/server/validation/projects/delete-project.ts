import { z } from "zod";

export const deleteProjectSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  confirmationText: z.string().min(1, "Confirmation text is required"),
  confirmCheckbox: z.boolean().refine((val) => val === true, {
    message: "You must confirm that you understand the consequences",
  }),
});

export type DeleteProjectInput = z.infer<typeof deleteProjectSchema>;

