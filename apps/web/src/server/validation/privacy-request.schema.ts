import z from "zod";

/**
 * Schema for submitting a privacy request (restriction or objection)
 */
export const submitPrivacyRequestSchema = z.object({
  type: z.enum(["restriction", "objection"], {
    message: "Request type is required",
  }),
  scope: z.enum(
    ["ai_analysis", "usage_analytics", "marketing", "all_processing"],
    { message: "Processing scope is required" },
  ),
  reason: z
    .string()
    .max(1000, "Reason must be 1000 characters or less")
    .optional(),
});

export type SubmitPrivacyRequestInput = z.infer<
  typeof submitPrivacyRequestSchema
>;

/**
 * Schema for withdrawing a privacy request
 */
export const withdrawPrivacyRequestSchema = z.object({
  requestId: z.string().uuid("Invalid request ID"),
});

export type WithdrawPrivacyRequestInput = z.infer<
  typeof withdrawPrivacyRequestSchema
>;
