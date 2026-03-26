import type { BetterAuthUser } from "@/lib/auth";
import type {
  ActionError,
  ActionResult,
} from "@/lib/server-action-client/action-errors";
import type { ChatConversation } from "@/server/db/schema/chat-conversations";
import type { ChatMessage } from "@/server/db/schema/chat-messages";

// ============================================================================
// Chat Scope — discriminated union for project vs. organization context
// ============================================================================

export interface ProjectScope {
  readonly kind: "project";
  readonly projectId: string;
  readonly organizationId: string;
}

export interface OrganizationScope {
  readonly kind: "organization";
  readonly organizationId: string;
}

export type ChatScope = ProjectScope | OrganizationScope;

// ============================================================================
// Chat Pipeline Types
// ============================================================================

export interface ChatCaller {
  readonly user: BetterAuthUser;
  readonly userId: string;
  readonly organizationId: string;
  readonly userRole: string;
  readonly teamId?: string | null;
  readonly userTeamIds?: string[];
}

export interface ChatRequest {
  readonly message: string;
  readonly conversationId?: string;
  readonly scope: ChatScope;
}

export interface ChatStreamResult {
  readonly response: Response;
  readonly conversationId: string;
}

// ============================================================================
// Conversation Service Types
// ============================================================================

export interface ListConversationsParams {
  readonly userId: string;
  readonly organizationId?: string;
  readonly projectId?: string;
  readonly context?: "project" | "organization";
  readonly filter?: "all" | "active" | "archived" | "deleted";
  readonly page?: number;
  readonly limit?: number;
}

export interface ConversationListResult {
  readonly conversations: (ChatConversation & {
    lastMessage?: string | null;
  })[];
  readonly total: number;
}

export interface SearchConversationsParams {
  readonly userId: string;
  readonly query: string;
  readonly organizationId?: string;
  readonly projectId?: string;
  readonly context?: "project" | "organization";
  readonly limit?: number;
}

export interface ConversationStats {
  readonly active: number;
  readonly archived: number;
  readonly deleted: number;
  readonly total: number;
}

// ============================================================================
// Source Citation Types (used internally by ChatContextService)
// ============================================================================

export type ContentType =
  | "recording"
  | "transcription"
  | "summary"
  | "task"
  | "knowledge_document"
  | "project_template"
  | "organization_instructions";

export interface SourceCitation {
  contentId: string;
  contentType: ContentType;
  title: string;
  excerpt: string;
  similarityScore: number;
  recordingId?: string;
  timestamp?: number;
  recordingDate?: string;
  projectName?: string;
  projectId?: string;
  documentId?: string;
  documentTitle?: string;
}

export interface ContextWithSources {
  context: string;
  sources: SourceCitation[];
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export type { ActionResult, ActionError };
export type { ChatConversation, ChatMessage };
