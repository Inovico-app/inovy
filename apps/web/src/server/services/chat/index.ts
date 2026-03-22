/**
 * Chat Module
 *
 * Deep module that replaces the monolithic ChatService (1,759 LOC) with
 * focused, single-responsibility services:
 *
 * - ChatPipeline: Unified streaming pipeline (sendMessage)
 * - ConversationService: Conversation lifecycle CRUD
 * - ChatContextService: Internal RAG context retrieval (not exported)
 */

export { ChatPipeline } from "./chat-pipeline.service";
export { ConversationService } from "./conversation.service";

// Re-export types for callers
export type {
  ChatCaller,
  ChatRequest,
  ChatScope,
  ChatStreamResult,
  ConversationListResult,
  ConversationStats,
  ListConversationsParams,
  OrganizationScope,
  ProjectScope,
  SearchConversationsParams,
} from "./types";
