import { getAuthSession } from "@/lib/auth/auth-helpers";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { AgentAnalyticsQueries } from "@/server/data-access/agent-analytics.queries";
import type { AgentMetric } from "@/server/db/schema/agent-metrics";
import type { NewAgentMetric } from "@/server/db/schema/agent-metrics";
import type { AnalyticsFilters } from "@/server/services/agent-analytics.service";
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
   * Check if user has admin permissions (admin or superadmin)
   */
  private static async checkAdminPermission(): Promise<Result<void, Error>> {
    const hasAdminPermission = await checkPermission(Permissions.admin.all);
    const hasSuperAdminPermission = await checkPermission(
      Permissions.superadmin.all
    );

    if (!hasAdminPermission && !hasSuperAdminPermission) {
      return err(new Error("Admin permission required"));
    }

    return ok(undefined);
  }

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

  /**
   * Get paginated metrics with filters
   */
  static async getMetrics(
    filters: AnalyticsFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<Result<{ metrics: AgentMetric[]; total: number }, Error>> {
    const permissionResult = await this.checkAdminPermission();
    if (permissionResult.isErr()) {
      return err(permissionResult.error);
    }

    try {
      const [metrics, total] = await Promise.all([
        AgentAnalyticsQueries.getMetricsByFilters(
          filters.startDate,
          filters.endDate,
          filters.organizationId,
          filters.userId,
          limit,
          offset
        ),
        AgentAnalyticsQueries.countMetricsByFilters(
          filters.startDate,
          filters.endDate,
          filters.organizationId,
          filters.userId
        ),
      ]);

      return ok({ metrics, total });
    } catch (error) {
      logger.error("Failed to get metrics", {
        error: error instanceof Error ? error.message : String(error),
        filters,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to get metrics")
      );
    }
  }

  /**
   * Escape a CSV field by wrapping in double quotes and doubling internal quotes
   */
  private static escapeCsvField(value: string | number | Date | boolean | null | undefined): string {
    if (value === null || value === undefined) {
      return "";
    }
    const stringValue =
      value instanceof Date ? value.toISOString() : String(value);
    // Wrap in double quotes and double any internal quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  /**
   * Export metrics data as CSV
   */
  static async exportMetricsAsCSV(
    filters: AnalyticsFilters
  ): Promise<Result<string, Error>> {
    const permissionResult = await this.checkAdminPermission();
    if (permissionResult.isErr()) {
      return err(permissionResult.error);
    }

    try {
      // Fetch all metrics (no pagination limit for export)
      const metrics = await AgentAnalyticsQueries.getMetricsByFilters(
        filters.startDate,
        filters.endDate,
        filters.organizationId,
        filters.userId
      );

      // Build CSV content
      const csvLines: string[] = [];

      // Header
      csvLines.push(
        "ID,Organization ID,User ID,Conversation ID,Request Type,Latency (ms),Error,Error Message,Token Count,Tool Calls,Query,Metadata,Created At"
      );

      // Data rows
      for (const metric of metrics) {
        const toolCallsStr = metric.toolCalls
          ? JSON.stringify(metric.toolCalls)
          : "";
        const metadataStr = metric.metadata
          ? JSON.stringify(metric.metadata)
          : "";

        csvLines.push(
          [
            this.escapeCsvField(metric.id),
            this.escapeCsvField(metric.organizationId),
            this.escapeCsvField(metric.userId),
            this.escapeCsvField(metric.conversationId),
            this.escapeCsvField(metric.requestType),
            this.escapeCsvField(metric.latencyMs),
            this.escapeCsvField(metric.error),
            this.escapeCsvField(metric.errorMessage),
            this.escapeCsvField(metric.tokenCount),
            this.escapeCsvField(toolCallsStr),
            this.escapeCsvField(metric.query),
            this.escapeCsvField(metadataStr),
            this.escapeCsvField(metric.createdAt),
          ].join(",")
        );
      }

      return ok(csvLines.join("\n"));
    } catch (error) {
      logger.error("Failed to export metrics as CSV", {
        error: error instanceof Error ? error.message : String(error),
        filters,
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to export metrics as CSV")
      );
    }
  }
}

