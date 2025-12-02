import { logger } from "@/lib/logger";
import { AgentAnalyticsQueries } from "@/server/data-access/agent-analytics.queries";
import type { NewAgentMetric } from "@/server/db/schema/agent-metrics";
import { err, ok, Result } from "neverthrow";

export interface AgentMetricInput {
  organizationId: string;
  userId: string;
  conversationId?: string;
  requestType?: "chat" | "knowledge_base" | "other";
  latencyMs?: number;
  error?: boolean;
  errorMessage?: string;
  tokenCount?: number;
  toolCalls?: string[];
  query?: string;
  metadata?: Record<string, unknown>;
}

export class AgentMetricsService {
  /**
   * Track an agent request metric
   */
  static async trackRequest(
    input: AgentMetricInput
  ): Promise<Result<void, Error>> {
    try {
      const metric = {
        organizationId: input.organizationId,
        userId: input.userId,
        conversationId: input.conversationId ?? null,
        requestType: input.requestType ?? "chat",
        latencyMs: input.latencyMs ?? null,
        error: input.error ?? false,
        errorMessage: input.errorMessage ?? null,
        tokenCount: input.tokenCount ?? null,
        toolCalls: input.toolCalls ?? null,
        query: input.query ?? null,
        metadata: input.metadata ?? null,
      } satisfies Omit<NewAgentMetric, "id" | "createdAt">;

      await AgentAnalyticsQueries.insertMetric(metric);

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to track agent metric", {
        error: error instanceof Error ? error.message : String(error),
        input,
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to track agent metric")
      );
    }
  }
}

