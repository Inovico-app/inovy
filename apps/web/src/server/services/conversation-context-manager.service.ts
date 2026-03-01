/**
 * Conversation Context Manager Service
 *
 * Manages conversation context with smart token-based pruning and summarization
 * for long conversation histories.
 */

import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { ChatQueries } from "@/server/data-access/chat.queries";
import type { ChatMessage, ToolCall } from "@/server/db/schema/chat-messages";
import { generateText, type ModelMessage } from "ai";
import { err, ok } from "neverthrow";
import { createGuardedModel } from "../ai/middleware";
import { connectionPool } from "./connection-pool.service";
import { PromptBuilder } from "./prompt-builder.service";

// ============================================================================
// Configuration Constants
// ============================================================================

const MAX_CONTEXT_TOKENS = 8000; // Maximum tokens for context window
const SUMMARY_THRESHOLD_TOKENS = 6000; // Threshold for triggering summarization
const RESERVE_TOKENS = 2000; // Tokens to reserve for system prompt and new messages

// ============================================================================
// Type Definitions
// ============================================================================

export interface ConversationContext {
  messages: ModelMessage[];
  summary?: string;
}

export interface ConversationSummarizeParams {
  messages: ChatMessage[];
  conversationId: string;
}

// ============================================================================
// ConversationContextManager Class
// ============================================================================

export class ConversationContextManager {
  /**
   * Estimate token count for text (approximation: ~4 chars per token)
   * Consistent with RAGService.chunkText approach
   */
  static estimateTokenCount(text: string): number {
    if (!text) return 0;
    // Approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Count total tokens in an array of messages
   */
  static countTokensInMessages(messages: ModelMessage[]): number {
    let totalTokens = 0;
    for (const message of messages) {
      // Count content tokens
      if (typeof message.content === "string") {
        totalTokens += this.estimateTokenCount(message.content);
      } else if (Array.isArray(message.content)) {
        // Handle content array (e.g., text parts)
        for (const part of message.content) {
          if (part.type === "text" && "text" in part) {
            totalTokens += this.estimateTokenCount(part.text);
          }
        }
      }

      // Count tool call tokens if present
      if ("toolCalls" in message && Array.isArray(message.toolCalls)) {
        for (const toolCall of message.toolCalls) {
          totalTokens += this.estimateTokenCount(JSON.stringify(toolCall));
        }
      }

      // Add overhead for message structure (~10 tokens per message)
      totalTokens += 10;
    }
    return totalTokens;
  }

  /**
   * Prune messages by token limit while maintaining conversation flow
   * Always keeps the most recent messages and prunes from the beginning/middle
   */
  static pruneMessagesByTokenLimit(
    messages: ModelMessage[],
    maxTokens: number,
    reserveTokens: number
  ): ModelMessage[] {
    const availableTokens = maxTokens - reserveTokens;

    // If messages fit within limit, return as-is
    const totalTokens = this.countTokensInMessages(messages);
    if (totalTokens <= availableTokens) {
      return messages;
    }

    // Start from the end (most recent) and work backwards
    const prunedMessages: ModelMessage[] = [];
    let currentTokens = 0;

    // Always keep the last message (user's current query)
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const messageTokens = this.countTokensInMessages([message]);

      // If adding this message would exceed limit, stop
      if (currentTokens + messageTokens > availableTokens) {
        break;
      }

      prunedMessages.unshift(message);
      currentTokens += messageTokens;
    }

    // Ensure we have at least the last message
    if (prunedMessages.length === 0 && messages.length > 0) {
      prunedMessages.push(messages[messages.length - 1]);
    }

    logger.info("Pruned conversation messages", {
      component: "ConversationContextManager",
      originalCount: messages.length,
      prunedCount: prunedMessages.length,
      originalTokens: totalTokens,
      prunedTokens: this.countTokensInMessages(prunedMessages),
    });

    return prunedMessages;
  }

  /**
   * Convert ChatMessage to ModelMessage format
   */
  private static chatMessageToModelMessage(message: ChatMessage): ModelMessage {
    const coreMessage: ModelMessage = {
      role: message.role as "user" | "assistant",
      content: message.content,
    };

    // Include tool calls if present
    if (message.toolCalls && message.toolCalls.length > 0) {
      (coreMessage as ModelMessage & { toolCalls: ToolCall[] }).toolCalls =
        message.toolCalls;
    }

    return coreMessage;
  }

  /**
   * Determine if conversation should be summarized
   */
  static shouldSummarize(
    messages: ChatMessage[],
    tokenCount: number,
    threshold: number
  ): boolean {
    // Summarize if token count exceeds threshold
    if (tokenCount > threshold) {
      return true;
    }

    // Also summarize if there are many messages (even if tokens are low)
    // This helps maintain context quality
    return messages.length > 20;
  }

  /**
   * Summarize a conversation using AI
   */
  static async summarizeConversation(
    params: ConversationSummarizeParams
  ): Promise<ActionResult<string>> {
    try {
      const { messages, conversationId } = params;

      logger.info("Starting conversation summarization", {
        component: "ConversationContextManager",
        conversationId,
        messageCount: messages.length,
      });

      // Build conversation text for summarization
      const conversationText = messages
        .map((msg) => {
          const role = msg.role === "user" ? "Gebruiker" : "Assistent";
          let content = msg.content;

          // Include tool calls if present
          if (msg.toolCalls && msg.toolCalls.length > 0) {
            const toolCallsText = msg.toolCalls
              .map(
                (tc) =>
                  `[Tool: ${tc.name}] ${JSON.stringify(tc.arguments)}${tc.result ? ` → ${typeof tc.result === "string" ? tc.result : JSON.stringify(tc.result)}` : ""}`
              )
              .join("\n");
            content += `\n${toolCallsText}`;
          }

          return `${role}: ${content}`;
        })
        .join("\n\n");

      // Build prompt using PromptBuilder
      const promptResult = PromptBuilder.Conversations.summarize({
        conversationText,
      });

      // Call AI SDK with guardrails and retry logic
      const completion = await connectionPool.executeWithRetry(
        async () =>
          connectionPool.withOpenAIClient(async (openai) => {
            const guardedModel = createGuardedModel(openai("gpt-5-nano"), {
              requestType: "conversation-summary",
              pii: { mode: "redact" },
              audit: { enabled: false },
            });

            return generateText({
              model: guardedModel,
              system: promptResult.systemPrompt,
              prompt: promptResult.userPrompt,
              providerOptions: {
                openai: { responseFormat: { type: "json_object" } },
              },
            });
          }),
        "openai"
      );

      const responseContent = completion.text;
      if (!responseContent) {
        return err(
          ActionErrors.internal(
            "No response content from summarization API",
            undefined,
            "ConversationContextManager.summarizeConversation"
          )
        );
      }

      // Parse summary from JSON response
      let summaryData: { summary: string };
      try {
        summaryData = JSON.parse(responseContent);
      } catch (parseError) {
        logger.error("Failed to parse summarization response", {
          component: "ConversationContextManager",
          conversationId,
          error: parseError,
        });
        return err(
          ActionErrors.internal(
            "Invalid JSON response from summarization API",
            parseError,
            "ConversationContextManager.summarizeConversation"
          )
        );
      }

      const summary = summaryData.summary;

      // Store summary in conversation
      await ChatQueries.updateConversationSummary(conversationId, summary);

      logger.info("Conversation summarization completed", {
        component: "ConversationContextManager",
        conversationId,
        summaryLength: summary.length,
      });

      return ok(summary);
    } catch (error) {
      logger.error("Conversation summarization failed", {
        component: "ConversationContextManager",
        conversationId: params.conversationId,
        error,
      });

      return err(
        ActionErrors.internal(
          "Conversation summarization failed",
          error,
          "ConversationContextManager.summarizeConversation"
        )
      );
    }
  }

  /**
   * Get conversation context with smart pruning and summarization
   */
  static async getConversationContext(
    conversationId: string,
    maxTokens: number = MAX_CONTEXT_TOKENS
  ): Promise<ActionResult<ConversationContext>> {
    try {
      // Load all messages
      const messages =
        await ChatQueries.getMessagesByConversationId(conversationId);

      if (messages.length === 0) {
        return ok({ messages: [] });
      }

      // Get existing summary if available
      const conversation =
        await ChatQueries.getConversationById(conversationId);
      let existingSummary = conversation?.summary ?? undefined;

      // Convert to ModelMessage format
      const coreMessages = messages.map((msg) =>
        this.chatMessageToModelMessage(msg)
      );

      // Count tokens
      const tokenCount = this.countTokensInMessages(coreMessages);

      // Check if summarization is needed
      const needsSummarization = this.shouldSummarize(
        messages,
        tokenCount,
        SUMMARY_THRESHOLD_TOKENS
      );

      // Generate summary if needed and not already exists
      if (needsSummarization && !existingSummary) {
        const summaryResult = await this.summarizeConversation({
          messages,
          conversationId,
        });

        if (summaryResult.isOk()) {
          existingSummary = summaryResult.value;
        } else {
          logger.warn("Failed to generate summary, continuing without it", {
            component: "ConversationContextManager",
            conversationId,
            error: summaryResult.error,
          });
        }
      }

      // Prune messages based on token limit
      const prunedMessages = this.pruneMessagesByTokenLimit(
        coreMessages,
        maxTokens,
        RESERVE_TOKENS
      );

      return ok({
        messages: prunedMessages,
        summary: existingSummary,
      });
    } catch (error) {
      logger.error("Failed to get conversation context", {
        component: "ConversationContextManager",
        conversationId,
        error,
      });

      return err(
        ActionErrors.internal(
          "Failed to get conversation context",
          error,
          "ConversationContextManager.getConversationContext"
        )
      );
    }
  }
}

