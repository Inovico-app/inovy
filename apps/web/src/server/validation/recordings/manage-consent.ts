import { z } from "zod";
import {
  consentMethodEnum,
  consentStatusEnum,
} from "../../db/schema/consent";

/**
 * Validation schema for granting consent
 * Note: Only "explicit" consent is allowed for GDPR/HIPAA compliance
 */
export const grantConsentSchema = z.object({
  recordingId: z.string().uuid("Invalid recording ID"),
  participantEmail: z.string().email("Invalid email address"),
  participantName: z.string().max(200, "Name too long").optional(),
  consentMethod: z
    .enum(consentMethodEnum)
    .default("explicit")
    .refine(
      (val) => val === "explicit",
      {
        message:
          "Only explicit consent is allowed for GDPR/HIPAA compliance. Implicit and bot-notification consent methods are not permitted.",
      }
    ),
});

export type GrantConsentInput = z.infer<typeof grantConsentSchema>;

/**
 * Validation schema for revoking consent
 */
export const revokeConsentSchema = z.object({
  recordingId: z.string().uuid("Invalid recording ID"),
  participantEmail: z.string().email("Invalid email address"),
});

export type RevokeConsentInput = z.infer<typeof revokeConsentSchema>;

/**
 * Validation schema for bulk consent operations
 * Note: Only "explicit" consent is allowed for GDPR/HIPAA compliance
 */
export const bulkGrantConsentSchema = z.object({
  recordingId: z.string().uuid("Invalid recording ID"),
  participants: z.array(
    z.object({
      email: z.string().email("Invalid email address"),
      name: z.string().max(200, "Name too long").optional(),
    })
  ),
  consentMethod: z
    .enum(consentMethodEnum)
    .default("explicit")
    .refine(
      (val) => val === "explicit",
      {
        message:
          "Only explicit consent is allowed for GDPR/HIPAA compliance. Implicit and bot-notification consent methods are not permitted.",
      }
    ),
});

export type BulkGrantConsentInput = z.infer<typeof bulkGrantConsentSchema>;

