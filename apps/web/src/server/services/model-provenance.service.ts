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
    modelId: "gpt-5-nano",
    provider: "openai",
    purpose: "Primary chat agent (default, configurable)",
    configurable: true,
    usedBy: "ChatService.streamResponse / streamOrganizationResponse",
  },
  {
    modelId: "gpt-4o",
    provider: "openai",
    purpose: "Chat agent (admin-selectable alternative)",
    configurable: true,
    usedBy: "ChatService.streamResponse / streamOrganizationResponse",
  },
  {
    modelId: "gpt-4-turbo",
    provider: "openai",
    purpose: "Chat agent (admin-selectable alternative)",
    configurable: true,
    usedBy: "ChatService.streamResponse / streamOrganizationResponse",
  },
  {
    modelId: "gpt-4",
    provider: "openai",
    purpose: "Chat agent (admin-selectable alternative)",
    configurable: true,
    usedBy: "ChatService.streamResponse / streamOrganizationResponse",
  },
  {
    modelId: "gpt-3.5-turbo",
    provider: "openai",
    purpose: "Chat agent (admin-selectable alternative)",
    configurable: true,
    usedBy: "ChatService.streamResponse / streamOrganizationResponse",
  },
  {
    modelId: "gpt-5-nano",
    provider: "openai",
    purpose: "Meeting transcription summarization",
    configurable: false,
    usedBy: "SummaryService",
  },
  {
    modelId: "gpt-5-nano",
    provider: "openai",
    purpose: "Conversation context compression",
    configurable: false,
    usedBy: "ConversationContextManagerService",
  },
  {
    modelId: "gpt-5-nano",
    provider: "openai",
    purpose: "Recording transcription",
    configurable: false,
    usedBy: "TranscriptionService",
  },
  {
    modelId: "gpt-5-nano",
    provider: "openai",
    purpose: "Task extraction from recordings",
    configurable: false,
    usedBy: "TaskExtractionService",
  },
  {
    modelId: "gpt-4o-mini",
    provider: "openai",
    purpose: "Agenda tracking during meetings",
    configurable: false,
    usedBy: "AgendaTrackerService",
  },
  {
    modelId: "text-moderation-latest",
    provider: "openai",
    purpose: "Input content moderation",
    configurable: false,
    usedBy: "InputModerationMiddleware",
  },
] as const;

export interface ProvenanceRecord {
  /** Model ID used for this invocation */
  modelId: string;
  /** Provider name */
  provider: string;
  /** Organization that triggered the call */
  organizationId: string;
  /** Conversation or request identifier */
  conversationId?: string;
  /** Token counts from the response */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
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
      promptTokens: record.usage?.promptTokens,
      completionTokens: record.usage?.completionTokens,
      totalTokens: record.usage?.totalTokens,
    });
  }
}
