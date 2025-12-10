import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { ChatService } from "../services/chat.service";

/**
 * Cached chat queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get conversation history/messages (cached)
 * Calls ChatService which includes business logic
 */
export async function getCachedConversationHistory(conversationId: string) {
  "use cache";
  cacheTag(CacheTags.conversationMessages(conversationId));
  return await ChatService.getConversationHistory(conversationId);
}

/**
 * List conversations with pagination (cached)
 * Calls ChatService which includes business logic
 */
export async function getCachedConversations(params: {
  userId: string;
  organizationId?: string;
  projectId?: string;
  context?: "project" | "organization";
  filter?: "all" | "active" | "archived" | "deleted";
  page?: number;
  limit?: number;
}) {
  "use cache";
  cacheTag(CacheTags.conversations(params.userId, params.organizationId ?? ""));
  return await ChatService.listConversations(params);
}

