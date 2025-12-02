import { db } from "@/server/db";
import {
  agentMetrics,
  type AgentMetric,
  type NewAgentMetric,
} from "@/server/db/schema/agent-metrics";
import { members, organizations, users } from "@/server/db/schema/auth";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

export interface ToolUsageStat {
  toolName: string;
  count: number;
}

export interface TopQuery {
  query: string;
  count: number;
  lastUsed: Date;
}

export class AgentAnalyticsQueries {
  /**
   * Get request count over time grouped by time intervals
   */
  static async getRequestCountOverTime(
    startDate: Date,
    endDate: Date,
    organizationId?: string,
    userId?: string
  ): Promise<TimeSeriesDataPoint[]> {
    const conditions = [
      gte(agentMetrics.createdAt, startDate),
      lte(agentMetrics.createdAt, endDate),
    ];

    if (organizationId) {
      conditions.push(eq(agentMetrics.organizationId, organizationId));
    }

    if (userId) {
      conditions.push(eq(agentMetrics.userId, userId));
    }

    const results = await db
      .select({
        date: sql<string>`DATE_TRUNC('hour', ${agentMetrics.createdAt})::text`,
        value: count(),
      })
      .from(agentMetrics)
      .where(and(...conditions))
      .groupBy(sql`DATE_TRUNC('hour', ${agentMetrics.createdAt})`)
      .orderBy(sql`DATE_TRUNC('hour', ${agentMetrics.createdAt})`);

    return results.map((r) => ({
      date: r.date,
      value: Number(r.value),
    }));
  }

  /**
   * Get average latency per time interval
   */
  static async getAverageLatency(
    startDate: Date,
    endDate: Date,
    organizationId?: string,
    userId?: string
  ): Promise<TimeSeriesDataPoint[]> {
    const conditions = [
      gte(agentMetrics.createdAt, startDate),
      lte(agentMetrics.createdAt, endDate),
      sql`${agentMetrics.latencyMs} IS NOT NULL`,
    ];

    if (organizationId) {
      conditions.push(eq(agentMetrics.organizationId, organizationId));
    }

    if (userId) {
      conditions.push(eq(agentMetrics.userId, userId));
    }

    const results = await db
      .select({
        date: sql<string>`DATE_TRUNC('hour', ${agentMetrics.createdAt})::text`,
        value: sql<number>`AVG(${agentMetrics.latencyMs})`,
      })
      .from(agentMetrics)
      .where(and(...conditions))
      .groupBy(sql`DATE_TRUNC('hour', ${agentMetrics.createdAt})`)
      .orderBy(sql`DATE_TRUNC('hour', ${agentMetrics.createdAt})`);

    return results.map((r) => ({
      date: r.date,
      value: Number(r.value),
    }));
  }

  /**
   * Get error rate per time interval
   */
  static async getErrorRate(
    startDate: Date,
    endDate: Date,
    organizationId?: string,
    userId?: string
  ): Promise<TimeSeriesDataPoint[]> {
    const conditions = [
      gte(agentMetrics.createdAt, startDate),
      lte(agentMetrics.createdAt, endDate),
    ];

    if (organizationId) {
      conditions.push(eq(agentMetrics.organizationId, organizationId));
    }

    if (userId) {
      conditions.push(eq(agentMetrics.userId, userId));
    }

    const results = await db
      .select({
        date: sql<string>`DATE_TRUNC('hour', ${agentMetrics.createdAt})::text`,
        total: count(),
        errors: sql<number>`COUNT(*) FILTER (WHERE ${agentMetrics.error} = true)`,
      })
      .from(agentMetrics)
      .where(and(...conditions))
      .groupBy(sql`DATE_TRUNC('hour', ${agentMetrics.createdAt})`)
      .orderBy(sql`DATE_TRUNC('hour', ${agentMetrics.createdAt})`);

    return results.map((r) => ({
      date: r.date,
      value: Number(r.total) > 0 ? (Number(r.errors) / Number(r.total)) * 100 : 0,
    }));
  }

  /**
   * Get token usage summed per time interval
   */
  static async getTokenUsage(
    startDate: Date,
    endDate: Date,
    organizationId?: string,
    userId?: string
  ): Promise<TimeSeriesDataPoint[]> {
    const conditions = [
      gte(agentMetrics.createdAt, startDate),
      lte(agentMetrics.createdAt, endDate),
      sql`${agentMetrics.tokenCount} IS NOT NULL`,
    ];

    if (organizationId) {
      conditions.push(eq(agentMetrics.organizationId, organizationId));
    }

    if (userId) {
      conditions.push(eq(agentMetrics.userId, userId));
    }

    const results = await db
      .select({
        date: sql<string>`DATE_TRUNC('hour', ${agentMetrics.createdAt})::text`,
        value: sql<number>`SUM(${agentMetrics.tokenCount})`,
      })
      .from(agentMetrics)
      .where(and(...conditions))
      .groupBy(sql`DATE_TRUNC('hour', ${agentMetrics.createdAt})`)
      .orderBy(sql`DATE_TRUNC('hour', ${agentMetrics.createdAt})`);

    return results.map((r) => ({
      date: r.date,
      value: Number(r.value),
    }));
  }

  /**
   * Get tool usage statistics for pie chart
   */
  static async getToolUsageStats(
    startDate: Date,
    endDate: Date,
    organizationId?: string,
    userId?: string
  ): Promise<ToolUsageStat[]> {
    const conditions = [
      gte(agentMetrics.createdAt, startDate),
      lte(agentMetrics.createdAt, endDate),
      sql`${agentMetrics.toolCalls} IS NOT NULL`,
    ];

    if (organizationId) {
      conditions.push(eq(agentMetrics.organizationId, organizationId));
    }

    if (userId) {
      conditions.push(eq(agentMetrics.userId, userId));
    }

    // Get all metrics with tool calls
    const metrics = await db
      .select({
        toolCalls: agentMetrics.toolCalls,
      })
      .from(agentMetrics)
      .where(and(...conditions));

    // Aggregate tool usage counts
    const toolCounts = new Map<string, number>();

    for (const metric of metrics) {
      if (metric.toolCalls && Array.isArray(metric.toolCalls)) {
        for (const toolName of metric.toolCalls) {
          if (typeof toolName === "string") {
            toolCounts.set(toolName, (toolCounts.get(toolName) || 0) + 1);
          }
        }
      }
    }

    return Array.from(toolCounts.entries())
      .map(([toolName, count]) => ({
        toolName,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get top queries by frequency
   */
  static async getTopQueries(
    startDate: Date,
    endDate: Date,
    organizationId?: string,
    userId?: string,
    limit: number = 10
  ): Promise<TopQuery[]> {
    const conditions = [
      gte(agentMetrics.createdAt, startDate),
      lte(agentMetrics.createdAt, endDate),
      sql`${agentMetrics.query} IS NOT NULL`,
    ];

    if (organizationId) {
      conditions.push(eq(agentMetrics.organizationId, organizationId));
    }

    if (userId) {
      conditions.push(eq(agentMetrics.userId, userId));
    }

    const results = await db
      .select({
        query: agentMetrics.query,
        count: count(),
        lastUsed: sql<Date>`MAX(${agentMetrics.createdAt})`,
      })
      .from(agentMetrics)
      .where(and(...conditions))
      .groupBy(agentMetrics.query)
      .orderBy(desc(count()))
      .limit(limit);

    return results.map((r) => ({
      query: r.query!,
      count: Number(r.count),
      lastUsed: r.lastUsed,
    }));
  }

  /**
   * Get all organizations for filter dropdown
   */
  static async getOrganizationsList(): Promise<
    Array<{ id: string; name: string }>
  > {
    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
      })
      .from(organizations)
      .orderBy(organizations.name);

    return orgs;
  }

  /**
   * Get users for filter dropdown
   * If organizationId is provided, filter by organization
   */
  static async getUsersList(
    organizationId?: string
  ): Promise<Array<{ id: string; email: string; name: string | null }>> {
    if (organizationId) {
      // Get users from a specific organization via members table
      const orgMembers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
        })
        .from(users)
        .innerJoin(members, eq(members.userId, users.id))
        .where(eq(members.organizationId, organizationId))
        .orderBy(users.email);

      return orgMembers;
    }

    // Get all users
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .orderBy(users.email);

    return allUsers;
  }

  /**
   * Insert a new agent metric
   */
  static async insertMetric(
    metric: Omit<NewAgentMetric, "id" | "createdAt">
  ): Promise<AgentMetric> {
    const [result] = await db
      .insert(agentMetrics)
      .values(metric)
      .returning();

    return result;
  }
}

