import { logger } from "@/lib/logger";

/**
 * AI Model Provenance & Software Bill of Materials (SBOM).
 *
 * Provides a central registry of every AI model the application uses,
 * including provider, purpose, and version metadata. This enables:
 *
 * - Audit trails for which model produced a given output
 * - Regulatory compliance (EU AI Act, NIST AI RMF)
 * - Quick impact assessment when a provider issues a deprecation or CVE
 *
 * OWASP Agentic AI: AAI009 — Inadequate Provenance Tracking
 */

interface ModelEntry {
  /** Model identifier as sent to the provider API */
  modelId: string;
  /** Model provider (e.g. "openai") */
  provider: string;
  /** Human-readable purpose */
  purpose: string;
  /** Whether this model is configurable by admins */
  configurable: boolean;
  /** Where in the codebase this model is used */
  usedBy: string;
}

/**
 * Static registry of all AI models used by the application.
 * Update this whenever a new model call is added.
 */
const MODEL_REGISTRY: readonly ModelEntry[] = [
  {
    modelId: "claude-sonnet-4-6",
    provider: "anthropic",
    purpose: "Primary chat agent (default, configurable)",
    configurable: true,
    usedBy: "ChatPipeline.sendMessage",
  },
  {
    modelId: "claude-opus-4-6",
    provider: "anthropic",
    purpose: "Chat agent (admin-selectable alternative)",
    configurable: true,
    usedBy: "ChatPipeline.sendMessage",
  },
  {
    modelId: "claude-haiku-4-5-20251001",
    provider: "anthropic",
    purpose: "Chat agent (admin-selectable alternative)",
    configurable: true,
    usedBy: "ChatPipeline.sendMessage",
  },
  {
    modelId: "claude-sonnet-4-6",
    provider: "anthropic",
    purpose: "Meeting transcription summarization",
    configurable: false,
    usedBy: "SummaryService",
  },
  {
    modelId: "claude-sonnet-4-6",
    provider: "anthropic",
    purpose: "Conversation context compression",
    configurable: false,
    usedBy: "ConversationContextManagerService",
  },
  {
    modelId: "claude-sonnet-4-6",
    provider: "anthropic",
    purpose: "Recording transcription",
    configurable: false,
    usedBy: "TranscriptionService",
  },
  {
    modelId: "claude-sonnet-4-6",
    provider: "anthropic",
    purpose: "Task extraction from recordings",
    configurable: false,
    usedBy: "TaskExtractionService",
  },
  {
    modelId: "claude-sonnet-4-6",
    provider: "anthropic",
    purpose: "Agenda tracking during meetings",
    configurable: false,
    usedBy: "AgendaTrackerService",
  },
  {
    modelId: "text-embedding-3-large",
    provider: "openai",
    purpose: "Embeddings for vector store (RAG)",
    configurable: false,
    usedBy: "EmbeddingService / DocumentService",
  },
  {
    modelId: "text-moderation-latest",
    provider: "openai",
    purpose: "Input content moderation",
    configurable: false,
    usedBy: "InputModerationMiddleware",
  },
] as const;

export type AIProvider = "openai" | "anthropic";

export interface ProvenanceRecord {
  /** Model ID used for this invocation */
  modelId: string;
  /** Provider name */
  provider: AIProvider;
  /** Organization that triggered the call */
  organizationId: string;
  /** Conversation or request identifier */
  conversationId?: string;
  /** Whether this invocation used a fallback provider */
  isFallback?: boolean;
  /** Token counts from the response (matches Vercel AI SDK naming) */
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export class ModelProvenanceService {
  /**
   * Return the full AI model SBOM for audit or compliance endpoints.
   */
  static getSBOM(): {
    generatedAt: string;
    models: readonly ModelEntry[];
  } {
    return {
      generatedAt: new Date().toISOString(),
      models: MODEL_REGISTRY,
    };
  }

  /**
   * Log a provenance record for a specific model invocation.
   * Non-blocking — failures are logged but do not propagate.
   */
  static logInvocation(record: ProvenanceRecord): void {
    logger.info("AI model invocation recorded", {
      component: "ModelProvenanceService",
      modelId: record.modelId,
      provider: record.provider,
      organizationId: record.organizationId,
      conversationId: record.conversationId,
      isFallback: record.isFallback ?? false,
      inputTokens: record.usage?.inputTokens,
      outputTokens: record.usage?.outputTokens,
      totalTokens: record.usage?.totalTokens,
    });
  }
}
