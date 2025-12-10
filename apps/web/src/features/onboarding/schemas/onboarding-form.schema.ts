import { z } from "zod";

export const onboardingFormSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  signupType: z.enum(["individual", "organization"]),
  organizationName: z.string().optional(),
  orgSize: z.number().optional(),
  researchQuestion: z.string().optional(),
  referralSource: z.string().nullish(),
  referralSourceOther: z.string().nullish(),
  newsletterOptIn: z.boolean().optional(),
  inviteEmails: z.string().optional(),
});

export type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

