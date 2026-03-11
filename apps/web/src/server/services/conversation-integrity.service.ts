import { createHash } from "crypto";
import { logger } from "@/lib/logger";

/**
 * Conversation context integrity verification.
 *
 * Provides hash chain verification for conversation messages to detect
 * tampering with conversation history. Each message hash includes the
 * previous message's hash, creating an immutable chain.
 *
 * Also validates context window bounds to prevent oversized context
 * from being sent to the LLM.
 */

interface MessageForHashing {
  role: string;
  content: string;
}

/**
 * Maximum total characters allowed in the conversation context.
 * This is a safety bound — the ConversationContextManager handles
 * smart pruning, but this catches edge cases.
 */
const MAX_CONTEXT_CHARS = 200_000; // ~50k tokens

/**
 * Maximum number of messages in a single conversation context.
 */
const MAX_CONTEXT_MESSAGES = 100;

export class ConversationIntegrityService {
  /**
   * Compute a hash chain for a list of messages.
   * Each hash includes the previous hash, creating an immutable chain.
   * Returns the final chain hash.
   */
  static computeChainHash(messages: MessageForHashing[]): string {
    let previousHash = "genesis";

    for (const message of messages) {
      const payload = `${previousHash}|${message.role}|${message.content}`;
      previousHash = createHash("sha256")
        .update(payload, "utf-8")
        .digest("hex");
    }

    return previousHash;
  }

  /**
   * Verify that a conversation history hasn't been tampered with.
   * Recomputes the chain hash and compares to the expected value.
   */
  static verifyChain(
    messages: MessageForHashing[],
    expectedHash: string
  ): boolean {
    const actualHash = this.computeChainHash(messages);
    const isValid = actualHash === expectedHash;

    if (!isValid) {
      logger.security.suspiciousActivity(
        "Conversation context integrity check failed — history may have been tampered with",
        {
          component: "ConversationIntegrityService",
          messageCount: messages.length,
          expectedHash: expectedHash.slice(0, 16) + "...",
          actualHash: actualHash.slice(0, 16) + "...",
        }
      );
    }

    return isValid;
  }

  /**
   * Validate that the conversation context is within safe bounds.
   * Returns warnings for any violations (non-blocking).
   */
  static validateContextBounds(
    messages: MessageForHashing[]
  ): ContextBoundsResult {
    const warnings: string[] = [];

    // Check message count
    if (messages.length > MAX_CONTEXT_MESSAGES) {
      warnings.push(
        `Context contains ${messages.length} messages (max: ${MAX_CONTEXT_MESSAGES})`
      );
    }

    // Check total character count
    const totalChars = messages.reduce(
      (sum, m) => sum + m.content.length,
      0
    );
    if (totalChars > MAX_CONTEXT_CHARS) {
      warnings.push(
        `Context contains ${totalChars} characters (max: ${MAX_CONTEXT_CHARS})`
      );
    }

    // Check for suspiciously large individual messages
    const MAX_SINGLE_MESSAGE_CHARS = 50_000;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].content.length > MAX_SINGLE_MESSAGE_CHARS) {
        warnings.push(
          `Message at index ${i} is ${messages[i].content.length} chars (max: ${MAX_SINGLE_MESSAGE_CHARS})`
        );
      }
    }

    if (warnings.length > 0) {
      logger.warn("Conversation context bounds violations detected", {
        component: "ConversationIntegrityService",
        messageCount: messages.length,
        totalChars,
        warnings,
      });
    }

    return {
      isWithinBounds: warnings.length === 0,
      messageCount: messages.length,
      totalChars,
      warnings,
    };
  }
}

interface ContextBoundsResult {
  isWithinBounds: boolean;
  messageCount: number;
  totalChars: number;
  warnings: string[];
}
