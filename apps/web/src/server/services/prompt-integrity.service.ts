import { createHash } from "crypto";
import { logger } from "@/lib/logger";

/**
 * System prompt integrity verification.
 *
 * Computes a SHA-256 hash of the system prompt when it's built and verifies
 * it hasn't been modified before it's sent to the LLM. This detects:
 * - Memory corruption
 * - Middleware that inadvertently mutates the prompt
 * - Injection attacks that modify the prompt after construction
 *
 * The hash is computed once when the prompt is built and verified just
 * before the streamText call.
 */
export class PromptIntegrityService {
  /**
   * Compute a SHA-256 hash of a system prompt.
   */
  static computeHash(systemPrompt: string): string {
    return createHash("sha256").update(systemPrompt, "utf-8").digest("hex");
  }

  /**
   * Create an integrity-stamped prompt result.
   * Call this after building the system prompt.
   */
  static stamp(systemPrompt: string): StampedPrompt {
    return {
      systemPrompt,
      integrityHash: this.computeHash(systemPrompt),
    };
  }

  /**
   * Verify that a system prompt hasn't been modified since it was stamped.
   * Returns true if the prompt is intact, false if it's been tampered with.
   */
  static verify(stamped: StampedPrompt): boolean {
    const currentHash = this.computeHash(stamped.systemPrompt);
    const isValid = currentHash === stamped.integrityHash;

    if (!isValid) {
      logger.security.suspiciousActivity(
        "System prompt integrity check failed — prompt was modified after construction",
        {
          component: "PromptIntegrityService",
          expectedHash: stamped.integrityHash.slice(0, 16) + "...",
          actualHash: currentHash.slice(0, 16) + "...",
        }
      );
    }

    return isValid;
  }

  /**
   * Verify and return the prompt, or throw if tampered.
   */
  static verifyOrThrow(stamped: StampedPrompt): string {
    if (!this.verify(stamped)) {
      throw new Error(
        "System prompt integrity verification failed. The prompt was modified after construction."
      );
    }
    return stamped.systemPrompt;
  }
}

export interface StampedPrompt {
  systemPrompt: string;
  integrityHash: string;
}
