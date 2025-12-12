import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import type { ChatConversation } from "../db/schema/chat-conversations";
import type { ChatMessage } from "../db/schema/chat-messages";
import { ChatService } from "../services/chat.service";

/**
 * Cached chat queries
 * Uses Next.js 16 cache with tags for invalidation
 */

export interface ConversationsListResult {
  conversations: (ChatConversation & { lastMessage?: string | null })[];
  total: number;
}

/**
 * Get conversation history/messages (cached)
 * Calls ChatService which includes business logic
 */
export async function getCachedConversationHistory(
  conversationId: string
): Promise<ChatMessage[]> {
  "use cache";
  cacheTag(CacheTags.conversationMessages(conversationId));
  const result = await ChatService.getConversationHistory(conversationId);
  return result.isOk() ? result.value : [];
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
}): Promise<ConversationsListResult> {
  "use cache";
  cacheTag(CacheTags.conversations(params.userId, params.organizationId ?? ""));
  const result = await ChatService.listConversations(params);
  return result.isOk() ? result.value : { conversations: [], total: 0 };
}

