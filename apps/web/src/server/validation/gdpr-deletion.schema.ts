import z from "zod";

/**
 * Request user data deletion schema
 */
export const requestDeletionSchema = z.object({
  confirmationText: z
    .string()
    .min(1, "Confirmation text is required")
    .refine(
      (val) => val === "DELETE MY DATA",
      "Confirmation text must be exactly 'DELETE MY DATA'"
    ),
  confirmCheckbox: z
    .boolean()
    .refine((val) => val === true, "You must confirm the deletion"),
});

export type RequestDeletionInput = z.infer<typeof requestDeletionSchema>;

/**
 * Cancel deletion request schema
 */
export const cancelDeletionSchema = z.object({
  requestId: z.string().uuid("Invalid request ID"),
});

export type CancelDeletionInput = z.infer<typeof cancelDeletionSchema>;

