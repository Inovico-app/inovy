import { getAuthSession } from "@/lib/auth/auth-helpers";
import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import {
  AgentAnalyticsQueries,
  type TimeSeriesDataPoint,
  type ToolUsageStat,
  type TopQuery,
} from "@/server/data-access/agent-analytics.queries";
import { err, ok, type Result } from "neverthrow";

export interface AnalyticsFilters {
  startDate: Date;
  endDate: Date;
  organizationId?: string;
  userId?: string;
}

export class AgentAnalyticsService {
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
   * Get request count over time
   */
  static async getRequestCountOverTime(
    filters: AnalyticsFilters
  ): Promise<Result<TimeSeriesDataPoint[], Error>> {
    const permissionResult = await this.checkAdminPermission();
    if (permissionResult.isErr()) {
      return err(permissionResult.error);
    }

    try {
      const data = await AgentAnalyticsQueries.getRequestCountOverTime(
        filters.startDate,
        filters.endDate,
        filters.organizationId,
        filters.userId
      );

      return ok(data);
    } catch (error) {
      logger.error("Failed to get request count over time", {
        error: error instanceof Error ? error.message : String(error),
        filters,
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to get request count over time")
      );
    }
  }

  /**
   * Get average latency over time
   */
  static async getAverageLatency(
    filters: AnalyticsFilters
  ): Promise<Result<TimeSeriesDataPoint[], Error>> {
    const permissionResult = await this.checkAdminPermission();
    if (permissionResult.isErr()) {
      return err(permissionResult.error);
    }

    try {
      const data = await AgentAnalyticsQueries.getAverageLatency(
        filters.startDate,
        filters.endDate,
        filters.organizationId,
        filters.userId
      );

      return ok(data);
    } catch (error) {
      logger.error("Failed to get average latency", {
        error: error instanceof Error ? error.message : String(error),
        filters,
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to get average latency")
      );
    }
  }

  /**
   * Get error rate over time
   */
  static async getErrorRate(
    filters: AnalyticsFilters
  ): Promise<Result<TimeSeriesDataPoint[], Error>> {
    const permissionResult = await this.checkAdminPermission();
    if (permissionResult.isErr()) {
      return err(permissionResult.error);
    }

    try {
      const data = await AgentAnalyticsQueries.getErrorRate(
        filters.startDate,
        filters.endDate,
        filters.organizationId,
        filters.userId
      );

      return ok(data);
    } catch (error) {
      logger.error("Failed to get error rate", {
        error: error instanceof Error ? error.message : String(error),
        filters,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to get error rate")
      );
    }
  }

  /**
   * Get token usage over time
   */
  static async getTokenUsage(
    filters: AnalyticsFilters
  ): Promise<Result<TimeSeriesDataPoint[], Error>> {
    const permissionResult = await this.checkAdminPermission();
    if (permissionResult.isErr()) {
      return err(permissionResult.error);
    }

    try {
      const data = await AgentAnalyticsQueries.getTokenUsage(
        filters.startDate,
        filters.endDate,
        filters.organizationId,
        filters.userId
      );

      return ok(data);
    } catch (error) {
      logger.error("Failed to get token usage", {
        error: error instanceof Error ? error.message : String(error),
        filters,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to get token usage")
      );
    }
  }

  /**
   * Get tool usage statistics
   */
  static async getToolUsageStats(
    filters: AnalyticsFilters
  ): Promise<Result<ToolUsageStat[], Error>> {
    const permissionResult = await this.checkAdminPermission();
    if (permissionResult.isErr()) {
      return err(permissionResult.error);
    }

    try {
      const data = await AgentAnalyticsQueries.getToolUsageStats(
        filters.startDate,
        filters.endDate,
        filters.organizationId,
        filters.userId
      );

      return ok(data);
    } catch (error) {
      logger.error("Failed to get tool usage stats", {
        error: error instanceof Error ? error.message : String(error),
        filters,
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to get tool usage stats")
      );
    }
  }

  /**
   * Get top queries
   */
  static async getTopQueries(
    filters: AnalyticsFilters,
    limit: number = 10
  ): Promise<Result<TopQuery[], Error>> {
    const permissionResult = await this.checkAdminPermission();
    if (permissionResult.isErr()) {
      return err(permissionResult.error);
    }

    try {
      const data = await AgentAnalyticsQueries.getTopQueries(
        filters.startDate,
        filters.endDate,
        filters.organizationId,
        filters.userId,
        limit
      );

      return ok(data);
    } catch (error) {
      logger.error("Failed to get top queries", {
        error: error instanceof Error ? error.message : String(error),
        filters,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to get top queries")
      );
    }
  }

  /**
   * Get organizations list for filters
   * For non-superadmins, only returns their organization
   */
  static async getOrganizationsList(): Promise<
    Result<Array<{ id: string; name: string }>, Error>
  > {
    const permissionResult = await this.checkAdminPermission();
    if (permissionResult.isErr()) {
      return err(permissionResult.error);
    }

    try {
      const hasSuperAdminPermission = await checkPermission(
        Permissions.superadmin.all
      );

      // For non-superadmins, only return their organization
      if (!hasSuperAdminPermission) {
        const authResult = await getAuthSession();
        if (authResult.isErr() || !authResult.value.organization) {
          return ok([]);
        }
        const org = authResult.value.organization;
        return ok([{ id: org.id, name: org.name }]);
      }

      // For superadmins, return all organizations
      const data = await AgentAnalyticsQueries.getOrganizationsList();
      return ok(data);
    } catch (error) {
      logger.error("Failed to get organizations list", {
        error: error instanceof Error ? error.message : String(error),
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to get organizations list")
      );
    }
  }

  /**
   * Get users list for filters
   */
  static async getUsersList(
    organizationId?: string
  ): Promise<
    Result<Array<{ id: string; email: string; name: string | null }>, Error>
  > {
    const permissionResult = await this.checkAdminPermission();
    if (permissionResult.isErr()) {
      return err(permissionResult.error);
    }

    try {
      const data = await AgentAnalyticsQueries.getUsersList(organizationId);
      return ok(data);
    } catch (error) {
      logger.error("Failed to get users list", {
        error: error instanceof Error ? error.message : String(error),
        organizationId,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to get users list")
      );
    }
  }

  /**
   * Escape a CSV field by wrapping in double quotes and doubling internal quotes
   */
  private static escapeCsvField(value: string | number | Date): string {
    const stringValue =
      value instanceof Date ? value.toISOString() : String(value);
    // Wrap in double quotes and double any internal quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  /**
   * Export analytics data as CSV
   */
  static async exportAnalyticsAsCSV(
    filters: AnalyticsFilters
  ): Promise<Result<string, Error>> {
    const permissionResult = await this.checkAdminPermission();
    if (permissionResult.isErr()) {
      return err(permissionResult.error);
    }

    try {
      // Get all metrics data
      const [
        requestCountResult,
        latencyResult,
        errorRateResult,
        tokenUsageResult,
        toolUsageResult,
        topQueriesResult,
      ] = await Promise.all([
        this.getRequestCountOverTime(filters),
        this.getAverageLatency(filters),
        this.getErrorRate(filters),
        this.getTokenUsage(filters),
        this.getToolUsageStats(filters),
        this.getTopQueries(filters, 100),
      ]);

      // Build CSV content
      const csvLines: string[] = [];

      // Request Count
      csvLines.push("Request Count Over Time");
      csvLines.push("Date,Count");
      if (requestCountResult.isOk()) {
        for (const point of requestCountResult.value) {
          csvLines.push(
            `${this.escapeCsvField(point.date)},${point.value}`
          );
        }
      } else {
        csvLines.push(
          `${this.escapeCsvField("ERROR")},${this.escapeCsvField(requestCountResult.error.message)}`
        );
      }
      csvLines.push("");

      // Average Latency
      csvLines.push("Average Latency Over Time");
      csvLines.push("Date,Latency (ms)");
      if (latencyResult.isOk()) {
        for (const point of latencyResult.value) {
          csvLines.push(
            `${this.escapeCsvField(point.date)},${point.value}`
          );
        }
      } else {
        csvLines.push(
          `${this.escapeCsvField("ERROR")},${this.escapeCsvField(latencyResult.error.message)}`
        );
      }
      csvLines.push("");

      // Error Rate
      csvLines.push("Error Rate Over Time");
      csvLines.push("Date,Error Rate (%)");
      if (errorRateResult.isOk()) {
        for (const point of errorRateResult.value) {
          csvLines.push(
            `${this.escapeCsvField(point.date)},${point.value}`
          );
        }
      } else {
        csvLines.push(
          `${this.escapeCsvField("ERROR")},${this.escapeCsvField(errorRateResult.error.message)}`
        );
      }
      csvLines.push("");

      // Token Usage
      csvLines.push("Token Usage Over Time");
      csvLines.push("Date,Tokens");
      if (tokenUsageResult.isOk()) {
        for (const point of tokenUsageResult.value) {
          csvLines.push(
            `${this.escapeCsvField(point.date)},${point.value}`
          );
        }
      } else {
        csvLines.push(
          `${this.escapeCsvField("ERROR")},${this.escapeCsvField(tokenUsageResult.error.message)}`
        );
      }
      csvLines.push("");

      // Tool Usage
      csvLines.push("Tool Usage Statistics");
      csvLines.push("Tool Name,Count");
      if (toolUsageResult.isOk()) {
        for (const stat of toolUsageResult.value) {
          csvLines.push(
            `${this.escapeCsvField(stat.toolName)},${stat.count}`
          );
        }
      } else {
        csvLines.push(
          `${this.escapeCsvField("ERROR")},${this.escapeCsvField(toolUsageResult.error.message)}`
        );
      }
      csvLines.push("");

      // Top Queries
      csvLines.push("Top Queries");
      csvLines.push("Query,Count,Last Used");
      if (topQueriesResult.isOk()) {
        for (const query of topQueriesResult.value) {
          csvLines.push(
            `${this.escapeCsvField(query.query)},${query.count},${this.escapeCsvField(query.lastUsed)}`
          );
        }
      } else {
        csvLines.push(
          `${this.escapeCsvField("ERROR")},${this.escapeCsvField("ERROR")},${this.escapeCsvField(topQueriesResult.error.message)}`
        );
      }

      return ok(csvLines.join("\n"));
    } catch (error) {
      logger.error("Failed to export analytics as CSV", {
        error: error instanceof Error ? error.message : String(error),
        filters,
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to export analytics as CSV")
      );
    }
  }
}

