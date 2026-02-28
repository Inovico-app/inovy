import { z } from "zod";

export const guardrailsScopeSchema = z.enum([
  "default",
  "organization",
  "project",
]);

export const guardrailsActionSchema = z.enum(["block", "redact", "warn"]);

export const piiEntitySchema = z.enum([
  "EMAIL_ADDRESS",
  "PHONE_NUMBER",
  "PERSON",
  "CREDIT_CARD",
  "US_SSN",
  "IBAN_CODE",
  "IP_ADDRESS",
]);

export const updateGuardrailsPolicySchema = z.object({
  scope: guardrailsScopeSchema,
  scopeId: z.string().nullable(),

  enabled: z.boolean().optional(),

  piiDetectionEnabled: z.boolean().optional(),
  piiAction: guardrailsActionSchema.optional(),
  piiEntities: z.array(piiEntitySchema).min(1).optional(),

  jailbreakDetectionEnabled: z.boolean().optional(),
  jailbreakAction: z.enum(["block", "warn"]).optional(),

  toxicityDetectionEnabled: z.boolean().optional(),
  toxicityThreshold: z.number().min(0).max(1).optional(),
  toxicityAction: guardrailsActionSchema.optional(),

  hallucinationCheckEnabled: z.boolean().optional(),
  hallucinationAction: z.enum(["block", "warn"]).optional(),
});

export type UpdateGuardrailsPolicyInput = z.infer<
  typeof updateGuardrailsPolicySchema
>;

export const getGuardrailsViolationsSchema = z.object({
  organizationId: z.string(),
  projectId: z.string().nullable().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  violationType: z
    .enum(["pii", "jailbreak", "toxicity", "hallucination"])
    .optional(),
  direction: z.enum(["input", "output"]).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type GetGuardrailsViolationsInput = z.infer<
  typeof getGuardrailsViolationsSchema
>;
