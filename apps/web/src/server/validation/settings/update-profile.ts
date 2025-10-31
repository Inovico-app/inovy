import { z } from "zod";

export const updateProfileSchema = z.object({
  given_name: z.string().min(1, "First name is required").max(255),
  family_name: z.string().min(1, "Last name is required").max(255),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
