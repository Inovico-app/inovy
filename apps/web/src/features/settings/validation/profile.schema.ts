import { z } from "zod";

export const profileFormSchema = z.object({
  givenName: z
    .string()
    .max(100, "First name must be less than 100 characters")
    .optional()
    .or(z.literal("")),
  familyName: z
    .string()
    .max(100, "Last name must be less than 100 characters")
    .optional()
    .or(z.literal("")),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
