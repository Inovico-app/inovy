import { botStatusEnum } from "@/server/db/schema/bot-sessions";
import { z } from "zod";

/**
 * Bot Session Update Validation Schema
 * Type-safe input validation for bot session updates
 */

export const botSessionUpdateSchema = z.object({
  botStatus: z.enum(botStatusEnum).optional(),
  error: z
    .string()
    .max(1000, "Error message is too long")
    .nullable()
    .optional(),
  joinedAt: z.date().nullable().optional(),
  leftAt: z.date().nullable().optional(),
  participants: z.array(z.string()).nullable().optional(),
});

export type BotSessionUpdateInput = z.infer<typeof botSessionUpdateSchema>;

