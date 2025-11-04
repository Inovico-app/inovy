import { z } from "zod";

export const listConversationsSchema = z.object({
  context: z.enum(["project", "organization"]).optional(),
  projectId: z.string().uuid().optional(),
  filter: z.enum(["all", "active", "archived", "deleted"]).default("active"),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const searchConversationsSchema = z.object({
  query: z.string().min(1).max(200),
  context: z.enum(["project", "organization"]).optional(),
  projectId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(50).default(20),
});

export const conversationIdSchema = z.object({
  conversationId: z.string().uuid(),
});

export const exportConversationSchema = z.object({
  conversationId: z.string().uuid(),
  format: z.enum(["text", "pdf"]),
});

export type ListConversationsInput = z.infer<typeof listConversationsSchema>;
export type SearchConversationsInput = z.infer<
  typeof searchConversationsSchema
>;
export type ConversationIdInput = z.infer<typeof conversationIdSchema>;
export type ExportConversationInput = z.infer<typeof exportConversationSchema>;

