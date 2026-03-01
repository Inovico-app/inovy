import type { LanguageModelV3CallOptions } from "@ai-sdk/provider";

export interface GuardrailOptions {
  organizationId?: string;
  userId?: string;
  conversationId?: string;
  requestType?:
    | "chat"
    | "summary"
    | "task-extraction"
    | "transcription"
    | "conversation-summary";
  pii?: {
    mode: "redact" | "block";
    minConfidence?: number;
  };
  moderation?: {
    enabled: boolean;
    blockOnFlag?: boolean;
  };
  audit?: {
    enabled: boolean;
  };
}

export interface GuardrailViolation {
  type: "moderation" | "pii" | "injection" | "topic";
  severity: "block" | "warn";
  message: string;
  details?: Record<string, unknown>;
}

export class GuardrailError extends Error {
  readonly violation: GuardrailViolation;

  constructor(violation: GuardrailViolation) {
    super(violation.message);
    this.name = "GuardrailError";
    this.violation = violation;
  }
}

/**
 * Extract all text from the prompt messages in LanguageModelV3CallOptions.
 */
export function extractTextFromPrompt(
  params: LanguageModelV3CallOptions
): string {
  const texts: string[] = [];

  for (const message of params.prompt) {
    if (message.role === "user" || message.role === "assistant") {
      for (const part of message.content) {
        if (part.type === "text") {
          texts.push(part.text);
        }
      }
    }
  }

  return texts.join("\n");
}

/**
 * Extract the text content of the last user message from the prompt.
 */
export function extractLastUserMessage(
  params: LanguageModelV3CallOptions
): string {
  for (let i = params.prompt.length - 1; i >= 0; i--) {
    const message = params.prompt[i];
    if (message.role === "user") {
      const texts: string[] = [];
      for (const part of message.content) {
        if (part.type === "text") {
          texts.push(part.text);
        }
      }
      if (texts.length > 0) {
        return texts.join("\n");
      }
    }
  }

  return "";
}

/**
 * Extract text from a LanguageModelV3GenerateResult content array.
 * In stable v6, generate results use `.content` (array of content blocks)
 * rather than a single `.text` string.
 */
export function extractTextFromContent(
  content: Array<{ type: string; text?: string }>
): string {
  return content
    .filter(
      (block): block is { type: "text"; text: string } => block.type === "text"
    )
    .map((block) => block.text)
    .join("");
}

