import { logger } from "@/lib/logger";
import { PIIDetectionService } from "@/server/services/pii-detection.service";
import { circuitBreaker } from "@/server/services/circuit-breaker.service";
import { CriticalActionRegistry } from "@/server/services/critical-action-registry";

/**
 * Maximum size (in bytes) of a tool's JSON-serialized output before truncation.
 * Prevents runaway results from consuming excessive tokens.
 */
const MAX_OUTPUT_BYTES = 50_000; // 50 KB

/**
 * Default per-tool execution timeout in milliseconds.
 */
const DEFAULT_TIMEOUT_MS = 10_000; // 10 seconds

/**
 * PII confidence threshold for tool output redaction.
 */
const PII_MIN_CONFIDENCE = 0.7;

/**
 * Maximum tool calls allowed per conversation.
 * Tracked in-memory per request (not persisted — the AI SDK's stepCountIs
 * already limits per-request steps, this adds a secondary per-conversation cap).
 */
export const MAX_TOOL_CALLS_PER_CONVERSATION = 50;

/**
 * In-memory counters keyed by conversationId.
 * Entries are cleared when a response finishes streaming.
 */
const conversationToolCallCounts = new Map<string, number>();

export function getToolCallCount(conversationId: string): number {
  return conversationToolCallCounts.get(conversationId) ?? 0;
}

export function incrementToolCallCount(conversationId: string): number {
  const current = getToolCallCount(conversationId);
  const next = current + 1;
  conversationToolCallCounts.set(conversationId, next);
  return next;
}

export function resetToolCallCount(conversationId: string): void {
  conversationToolCallCounts.delete(conversationId);
}

interface SandboxOptions {
  timeoutMs?: number;
  maxOutputBytes?: number;
  redactPII?: boolean;
  conversationId?: string;
  toolName?: string;
  userId?: string;
  organizationId?: string;
}

/**
 * Wraps a tool execute function with:
 * 1. Circuit breaker check (skip if tool is in failure state)
 * 2. Human-in-the-loop gate (block tools requiring approval)
 * 3. Per-conversation tool call budget
 * 4. Execution timeout
 * 5. Output size cap (truncation)
 * 6. PII redaction on output
 * 7. Structured audit logging
 */
export function sandboxExecute<TInput, TOutput>(
  executeFn: (input: TInput) => Promise<TOutput>,
  options: SandboxOptions = {}
): (input: TInput) => Promise<TOutput | { error: string }> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxOutputBytes = MAX_OUTPUT_BYTES,
    redactPII = true,
    conversationId,
    toolName = "unknown",
    userId,
    organizationId,
  } = options;

  return async (input: TInput): Promise<TOutput | { error: string }> => {
    const startTime = Date.now();

    // 1. Circuit breaker check — skip execution if tool is in failure state
    if (organizationId) {
      const allowed = await circuitBreaker.canExecute(organizationId, toolName);
      if (!allowed) {
        logger.warn("Tool blocked by circuit breaker", {
          component: "ToolSandbox",
          toolName,
          organizationId,
          userId,
        });
        return {
          error: `Tool "${toolName}" is temporarily unavailable due to repeated failures. It will recover automatically.`,
        } as TOutput | { error: string };
      }
    }

    // 2. Human-in-the-loop gate — block tools that require approval
    if (CriticalActionRegistry.requiresApproval(toolName)) {
      logger.warn("Tool requires human approval — blocking execution", {
        component: "ToolSandbox",
        toolName,
        classification: CriticalActionRegistry.getClassification(toolName),
        userId,
        organizationId,
      });
      return {
        error: `Action "${toolName}" requires human approval before execution. This action has been blocked.`,
      } as TOutput | { error: string };
    }

    // 3. Check per-conversation tool call budget
    if (conversationId) {
      const count = incrementToolCallCount(conversationId);
      if (count > MAX_TOOL_CALLS_PER_CONVERSATION) {
        logger.warn("Tool call budget exceeded for conversation", {
          component: "ToolSandbox",
          toolName,
          conversationId,
          count,
          limit: MAX_TOOL_CALLS_PER_CONVERSATION,
        });
        return {
          error: `Tool call limit reached (${MAX_TOOL_CALLS_PER_CONVERSATION} per conversation). Please start a new conversation.`,
        } as TOutput | { error: string };
      }
    }

    // 4. Execute with timeout
    let result: TOutput;
    try {
      result = await Promise.race([
        executeFn(input),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Tool "${toolName}" timed out after ${timeoutMs}ms`)),
            timeoutMs
          )
        ),
      ]);

      // Record success for circuit breaker
      if (organizationId) {
        await circuitBreaker.recordSuccess(organizationId, toolName).catch(() => {});
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      // Record failure for circuit breaker
      if (organizationId) {
        await circuitBreaker.recordFailure(organizationId, toolName).catch(() => {});
      }

      logger.error("Tool execution failed in sandbox", {
        component: "ToolSandbox",
        toolName,
        latencyMs,
        userId,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: `Tool "${toolName}" failed to execute.` } as TOutput | { error: string };
    }

    const latencyMs = Date.now() - startTime;

    // 5. Serialize and check output size
    let serialized: string;
    try {
      serialized = JSON.stringify(result);
    } catch {
      logger.error("Tool output not serializable", {
        component: "ToolSandbox",
        toolName,
        latencyMs,
      });
      return { error: "Tool returned non-serializable output." } as TOutput | { error: string };
    }

    if (serialized.length > maxOutputBytes) {
      logger.warn("Tool output truncated", {
        component: "ToolSandbox",
        toolName,
        originalBytes: serialized.length,
        maxBytes: maxOutputBytes,
        userId,
        organizationId,
      });
      // Truncate the serialized output and re-parse
      serialized = serialized.slice(0, maxOutputBytes);
      // Try to produce valid JSON by returning a wrapper
      return {
        error: `Output truncated from ${serialized.length} bytes to ${maxOutputBytes} bytes. Try narrowing your query.`,
      } as TOutput | { error: string };
    }

    // 6. PII redaction on output
    if (redactPII) {
      const detections = PIIDetectionService.detectPII(serialized, PII_MIN_CONFIDENCE);
      if (detections.length > 0) {
        // Apply redactions in reverse order to preserve indices
        const chars = serialized.split("");
        for (const detection of [...detections].reverse()) {
          const replacement = `[REDACTED:${detection.type}]`;
          chars.splice(
            detection.startIndex,
            detection.endIndex - detection.startIndex,
            replacement
          );
        }
        serialized = chars.join("");

        logger.info("PII redacted from tool output", {
          component: "ToolSandbox",
          toolName,
          redactedCount: detections.length,
          piiTypes: detections.map((d) => d.type),
          userId,
          organizationId,
        });

        try {
          result = JSON.parse(serialized) as TOutput;
        } catch {
          // If PII redaction broke JSON, return the redacted text as a message
          return { error: "Tool output contained sensitive data that was redacted." } as TOutput | {
            error: string;
          };
        }
      }
    }

    // 7. Audit log
    logger.debug("Tool execution completed", {
      component: "ToolSandbox",
      toolName,
      latencyMs,
      outputBytes: serialized.length,
      userId,
      organizationId,
      conversationId,
    });

    return result;
  };
}
