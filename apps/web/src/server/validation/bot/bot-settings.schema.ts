import { z } from "zod";

/**
 * Bot Settings Validation Schema
 * Type-safe input validation for bot settings
 */

export const botSettingsSchema = z.object({
  botEnabled: z.boolean().default(false),
  autoJoinEnabled: z.boolean().default(false),
  requirePerMeetingConsent: z.boolean().default(true),
  botDisplayName: z
    .string()
    .min(1, "Bot display name is required")
    .max(100, "Bot display name is too long")
    .default("Inovy Recording Bot"),
  botJoinMessage: z
    .string()
    .max(500, "Bot join message is too long")
    .nullable()
    .optional(),
  calendarIds: z.array(z.string()).nullable().optional(),
  inactivityTimeoutMinutes: z
    .number()
    .int("Inactivity timeout must be an integer")
    .min(1, "Inactivity timeout must be at least 1 minute")
    .max(480, "Inactivity timeout cannot exceed 480 minutes (8 hours)")
    .default(60),
});

export type BotSettingsInput = z.infer<typeof botSettingsSchema>;

