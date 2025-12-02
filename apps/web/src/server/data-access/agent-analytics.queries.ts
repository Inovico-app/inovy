import { db } from "@/server/db";
import {
  agentMetrics,
  type AgentMetric,
  type NewAgentMetric,
} from "@/server/db/schema/agent-metrics";
import { members, organizations, users } from "@/server/db/schema/auth";
import { chatConversations } from "@/server/db/schema/chat-conversations";
import { chatMessages } from "@/server/db/schema/chat-messages";
import { projects } from "@/server/db/schema/projects";
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
      value:
        Number(r.total) > 0 ? (Number(r.errors) / Number(r.total)) * 100 : 0,
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
    const [result] = await db.insert(agentMetrics).values(metric).returning();

    return result;
  }

  /**
   * Get raw agent metrics with filters and pagination
   */
  static async getMetricsByFilters(
    startDate: Date,
    endDate: Date,
    organizationId?: string,
    userId?: string,
    limit?: number,
    offset?: number
  ): Promise<AgentMetric[]> {
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

    const baseQuery = db
      .select()
      .from(agentMetrics)
      .where(and(...conditions))
      .orderBy(desc(agentMetrics.createdAt));

    if (limit !== undefined && offset !== undefined) {
      return baseQuery.limit(limit).offset(offset);
    } else if (limit !== undefined) {
      return baseQuery.limit(limit);
    } else if (offset !== undefined) {
      return baseQuery.offset(offset);
    }

    return baseQuery;
  }

  /**
   * Count total metrics matching filters
   */
  static async countMetricsByFilters(
    startDate: Date,
    endDate: Date,
    organizationId?: string,
    userId?: string
  ): Promise<number> {
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

    const [result] = await db
      .select({ count: count() })
      .from(agentMetrics)
      .where(and(...conditions));

    return Number(result?.count ?? 0);
  }

  /**
   * Get files processed count for a user (recordings, knowledge documents)
   */
  static async getFilesProcessedCount(
    userId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Count unique recordings and knowledge documents accessed by user through chat
    const conversations = await db
      .select({ id: chatConversations.id })
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.userId, userId),
          eq(chatConversations.organizationId, organizationId),
          gte(chatConversations.createdAt, startDate),
          lte(chatConversations.createdAt, endDate)
        )
      );

    if (conversations.length === 0) {
      return 0;
    }

    const conversationIds = conversations.map((c) => c.id);

    // Get all assistant messages with sources
    const messages = await db
      .select({
        sources: chatMessages.sources,
      })
      .from(chatMessages)
      .where(
        and(
          sql`${chatMessages.conversationId} = ANY(ARRAY[${sql.join(
            conversationIds.map((id) => sql`${id}::uuid`),
            sql`, `
          )}]::uuid[])`,
          eq(chatMessages.role, "assistant"),
          sql`${chatMessages.sources} IS NOT NULL`
        )
      );

    // Extract unique files from sources
    const uniqueFiles = new Set<string>();
    for (const message of messages) {
      if (message.sources && Array.isArray(message.sources)) {
        for (const source of message.sources) {
          if (source.contentType === "recording" && source.recordingId) {
            uniqueFiles.add(`recording:${source.recordingId}`);
          } else if (
            source.contentType === "knowledge_document" &&
            source.contentId
          ) {
            uniqueFiles.add(`document:${source.contentId}`);
          }
        }
      }
    }

    return uniqueFiles.size;
  }

  /**
   * Get files used in responses count for a user
   */
  static async getFilesUsedInResponses(
    userId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ contentType: string; count: number }>> {
    const conversations = await db
      .select({ id: chatConversations.id })
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.userId, userId),
          eq(chatConversations.organizationId, organizationId),
          gte(chatConversations.createdAt, startDate),
          lte(chatConversations.createdAt, endDate)
        )
      );

    if (conversations.length === 0) {
      return [];
    }

    const conversationIds = conversations.map((c) => c.id);

    const messages = await db
      .select({
        sources: chatMessages.sources,
      })
      .from(chatMessages)
      .where(
        and(
          sql`${chatMessages.conversationId} = ANY(ARRAY[${sql.join(
            conversationIds.map((id) => sql`${id}::uuid`),
            sql`, `
          )}]::uuid[])`,
          eq(chatMessages.role, "assistant"),
          sql`${chatMessages.sources} IS NOT NULL`
        )
      );

    const contentTypeCounts = new Map<string, number>();
    for (const message of messages) {
      if (message.sources && Array.isArray(message.sources)) {
        for (const source of message.sources) {
          const current = contentTypeCounts.get(source.contentType) || 0;
          contentTypeCounts.set(source.contentType, current + 1);
        }
      }
    }

    return Array.from(contentTypeCounts.entries()).map(
      ([contentType, count]) => ({
        contentType,
        count,
      })
    );
  }

  /**
   * Get user engagement metrics
   */
  static async getUserEngagementMetrics(
    userId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
    filesProcessed: number;
  }> {
    const [conversations, messages] = await Promise.all([
      db
        .select({ count: count() })
        .from(chatConversations)
        .where(
          and(
            eq(chatConversations.userId, userId),
            eq(chatConversations.organizationId, organizationId),
            gte(chatConversations.createdAt, startDate),
            lte(chatConversations.createdAt, endDate)
          )
        ),
      db
        .select({ count: count() })
        .from(chatMessages)
        .innerJoin(
          chatConversations,
          eq(chatMessages.conversationId, chatConversations.id)
        )
        .where(
          and(
            eq(chatConversations.userId, userId),
            eq(chatConversations.organizationId, organizationId),
            gte(chatMessages.createdAt, startDate),
            lte(chatMessages.createdAt, endDate)
          )
        ),
    ]);

    const totalConversations = Number(conversations[0]?.count ?? 0);
    const totalMessages = Number(messages[0]?.count ?? 0);
    const averageMessagesPerConversation =
      totalConversations > 0 ? totalMessages / totalConversations : 0;

    const filesProcessed = await this.getFilesProcessedCount(
      userId,
      organizationId,
      startDate,
      endDate
    );

    return {
      totalConversations,
      totalMessages,
      averageMessagesPerConversation:
        Math.round(averageMessagesPerConversation * 100) / 100,
      filesProcessed,
    };
  }

  /**
   * Get project engagement for a user
   */
  static async getUserProjectEngagement(
    userId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      projectId: string;
      projectName: string;
      conversationCount: number;
      messageCount: number;
    }>
  > {
    const results = await db
      .select({
        projectId: chatConversations.projectId,
        projectName: projects.name,
        conversationCount: count(chatConversations.id),
      })
      .from(chatConversations)
      .innerJoin(projects, eq(chatConversations.projectId, projects.id))
      .where(
        and(
          eq(chatConversations.userId, userId),
          eq(chatConversations.organizationId, organizationId),
          sql`${chatConversations.projectId} IS NOT NULL`,
          gte(chatConversations.createdAt, startDate),
          lte(chatConversations.createdAt, endDate)
        )
      )
      .groupBy(chatConversations.projectId, projects.name)
      .orderBy(desc(count(chatConversations.id)))
      .limit(10);

    // Get message counts for each project
    const projectEngagement = await Promise.all(
      results
        .filter((result) => result.projectId !== null)
        .map(async (result) => {
          const messageCountResult = await db
            .select({ count: count() })
            .from(chatMessages)
            .innerJoin(
              chatConversations,
              eq(chatMessages.conversationId, chatConversations.id)
            )
            .where(
              and(
                eq(chatConversations.projectId, result.projectId!),
                eq(chatConversations.userId, userId),
                gte(chatMessages.createdAt, startDate),
                lte(chatMessages.createdAt, endDate)
              )
            );

          return {
            projectId: result.projectId!,
            projectName: result.projectName,
            conversationCount: Number(result.conversationCount),
            messageCount: Number(messageCountResult[0]?.count ?? 0),
          };
        })
    );

    return projectEngagement;
  }

  /**
   * Get unique projects count for a user
   */
  static async getUserUniqueProjectsCount(
    userId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const result = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${chatConversations.projectId})`,
      })
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.userId, userId),
          eq(chatConversations.organizationId, organizationId),
          sql`${chatConversations.projectId} IS NOT NULL`,
          gte(chatConversations.createdAt, startDate),
          lte(chatConversations.createdAt, endDate)
        )
      );

    return Number(result[0]?.count ?? 0);
  }

  /**
   * Get tool usage patterns for a user
   */
  static async getUserToolUsage(
    userId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      toolName: string;
      count: number;
      errorCount: number;
      successRate: number;
    }>
  > {
    const metrics = await db
      .select({
        toolCalls: agentMetrics.toolCalls,
        error: agentMetrics.error,
      })
      .from(agentMetrics)
      .where(
        and(
          eq(agentMetrics.userId, userId),
          eq(agentMetrics.organizationId, organizationId),
          gte(agentMetrics.createdAt, startDate),
          lte(agentMetrics.createdAt, endDate),
          sql`${agentMetrics.toolCalls} IS NOT NULL`
        )
      );

    const toolStats = new Map<string, { total: number; errors: number }>();

    for (const metric of metrics) {
      if (metric.toolCalls && Array.isArray(metric.toolCalls)) {
        for (const toolName of metric.toolCalls) {
          if (typeof toolName === "string") {
            const current = toolStats.get(toolName) || {
              total: 0,
              errors: 0,
            };
            current.total++;
            if (metric.error) {
              current.errors++;
            }
            toolStats.set(toolName, current);
          }
        }
      }
    }

    return Array.from(toolStats.entries())
      .map(([toolName, stats]) => ({
        toolName,
        count: stats.total,
        errorCount: stats.errors,
        successRate:
          stats.total > 0
            ? Math.round(((stats.total - stats.errors) / stats.total) * 100)
            : 100,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get query complexity and performance metrics for a user
   */
  static async getUserQueryComplexity(
    userId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    averageQueryLength: number;
    averageTokenCount: number;
    totalTokens: number;
    averageLatency: number;
    errorRate: number;
  }> {
    const metrics = await db
      .select({
        query: agentMetrics.query,
        tokenCount: agentMetrics.tokenCount,
        latencyMs: agentMetrics.latencyMs,
        error: agentMetrics.error,
      })
      .from(agentMetrics)
      .where(
        and(
          eq(agentMetrics.userId, userId),
          eq(agentMetrics.organizationId, organizationId),
          gte(agentMetrics.createdAt, startDate),
          lte(agentMetrics.createdAt, endDate)
        )
      );

    if (metrics.length === 0) {
      return {
        averageQueryLength: 0,
        averageTokenCount: 0,
        totalTokens: 0,
        averageLatency: 0,
        errorRate: 0,
      };
    }

    let totalQueryLength = 0;
    let queryCount = 0;
    let totalTokens = 0;
    let tokenCount = 0;
    let totalLatency = 0;
    let latencyCount = 0;
    let errorCount = 0;

    for (const metric of metrics) {
      if (metric.query) {
        totalQueryLength += metric.query.length;
        queryCount++;
      }
      if (metric.tokenCount !== null) {
        totalTokens += metric.tokenCount;
        tokenCount++;
      }
      if (metric.latencyMs !== null) {
        totalLatency += metric.latencyMs;
        latencyCount++;
      }
      if (metric.error) {
        errorCount++;
      }
    }

    return {
      averageQueryLength:
        queryCount > 0 ? Math.round(totalQueryLength / queryCount) : 0,
      averageTokenCount:
        tokenCount > 0 ? Math.round(totalTokens / tokenCount) : 0,
      totalTokens,
      averageLatency:
        latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
      errorRate:
        metrics.length > 0
          ? Math.round((errorCount / metrics.length) * 100 * 100) / 100
          : 0,
    };
  }

  /**
   * Get knowledge base vs other sources breakdown for a user
   */
  static async getUserSourcePreference(
    userId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    knowledgeBaseUsage: number;
    recordingUsage: number;
    taskUsage: number;
    transcriptionUsage: number;
    summaryUsage: number;
    totalResponses: number;
    knowledgeBasePercentage: number;
  }> {
    const conversations = await db
      .select({ id: chatConversations.id })
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.userId, userId),
          eq(chatConversations.organizationId, organizationId),
          gte(chatConversations.createdAt, startDate),
          lte(chatConversations.createdAt, endDate)
        )
      );

    if (conversations.length === 0) {
      return {
        knowledgeBaseUsage: 0,
        recordingUsage: 0,
        taskUsage: 0,
        transcriptionUsage: 0,
        summaryUsage: 0,
        totalResponses: 0,
        knowledgeBasePercentage: 0,
      };
    }

    const conversationIds = conversations.map((c) => c.id);

    const messages = await db
      .select({
        sources: chatMessages.sources,
      })
      .from(chatMessages)
      .where(
        and(
          sql`${chatMessages.conversationId} = ANY(ARRAY[${sql.join(
            conversationIds.map((id) => sql`${id}::uuid`),
            sql`, `
          )}]::uuid[])`,
          eq(chatMessages.role, "assistant"),
          sql`${chatMessages.sources} IS NOT NULL`
        )
      );

    let knowledgeBaseUsage = 0;
    let recordingUsage = 0;
    let taskUsage = 0;
    let transcriptionUsage = 0;
    let summaryUsage = 0;
    const totalResponses = messages.length;

    for (const message of messages) {
      if (message.sources && Array.isArray(message.sources)) {
        const contentTypes = new Set<string>();
        for (const source of message.sources) {
          contentTypes.add(source.contentType);
        }

        if (contentTypes.has("knowledge_document")) {
          knowledgeBaseUsage++;
        }
        if (contentTypes.has("recording")) {
          recordingUsage++;
        }
        if (contentTypes.has("task")) {
          taskUsage++;
        }
        if (contentTypes.has("transcription")) {
          transcriptionUsage++;
        }
        if (contentTypes.has("summary")) {
          summaryUsage++;
        }
      }
    }

    const knowledgeBasePercentage =
      totalResponses > 0
        ? Math.round((knowledgeBaseUsage / totalResponses) * 100 * 100) / 100
        : 0;

    return {
      knowledgeBaseUsage,
      recordingUsage,
      taskUsage,
      transcriptionUsage,
      summaryUsage,
      totalResponses,
      knowledgeBasePercentage,
    };
  }

  /**
   * Get conversation patterns for a user
   */
  static async getUserConversationPatterns(
    userId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    averageDuration: number;
    longestConversation: number;
    singleMessageConversations: number;
    singleMessagePercentage: number;
  }> {
    const conversations = await db
      .select({
        id: chatConversations.id,
        createdAt: chatConversations.createdAt,
        updatedAt: chatConversations.updatedAt,
      })
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.userId, userId),
          eq(chatConversations.organizationId, organizationId),
          gte(chatConversations.createdAt, startDate),
          lte(chatConversations.createdAt, endDate)
        )
      );

    if (conversations.length === 0) {
      return {
        averageDuration: 0,
        longestConversation: 0,
        singleMessageConversations: 0,
        singleMessagePercentage: 0,
      };
    }

    const conversationIds = conversations.map((c) => c.id);

    // Get message counts per conversation
    const messageCounts = await db
      .select({
        conversationId: chatMessages.conversationId,
        count: count(),
      })
      .from(chatMessages)
      .where(
        sql`${chatMessages.conversationId} = ANY(ARRAY[${sql.join(
          conversationIds.map((id) => sql`${id}::uuid`),
          sql`, `
        )}]::uuid[])`
      )
      .groupBy(chatMessages.conversationId);

    const messageCountMap = new Map<string, number>();
    for (const mc of messageCounts) {
      messageCountMap.set(mc.conversationId, Number(mc.count));
    }

    let totalDuration = 0;
    let durationCount = 0;
    let longestConversation = 0;
    let singleMessageConversations = 0;

    for (const conv of conversations) {
      const messageCount = messageCountMap.get(conv.id) || 0;
      const duration = conv.updatedAt.getTime() - conv.createdAt.getTime();

      if (duration > 0) {
        totalDuration += duration;
        durationCount++;
      }

      if (messageCount > longestConversation) {
        longestConversation = messageCount;
      }

      if (messageCount <= 2) {
        // User message + assistant response = 2 messages
        singleMessageConversations++;
      }
    }

    const averageDuration =
      durationCount > 0
        ? Math.round(totalDuration / durationCount / 1000 / 60)
        : 0; // Convert to minutes

    const singleMessagePercentage =
      conversations.length > 0
        ? Math.round(
            (singleMessageConversations / conversations.length) * 100 * 100
          ) / 100
        : 0;

    return {
      averageDuration,
      longestConversation,
      singleMessageConversations,
      singleMessagePercentage,
    };
  }

  /**
   * Get quality indicators for a user
   */
  static async getUserQualityIndicators(
    userId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    averageResponseQuality: number;
    followUpRate: number;
    reEngagementRate: number;
    averageSourcesPerResponse: number;
  }> {
    const conversations = await db
      .select({ id: chatConversations.id })
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.userId, userId),
          eq(chatConversations.organizationId, organizationId),
          gte(chatConversations.createdAt, startDate),
          lte(chatConversations.createdAt, endDate)
        )
      );

    if (conversations.length === 0) {
      return {
        averageResponseQuality: 0,
        followUpRate: 0,
        reEngagementRate: 0,
        averageSourcesPerResponse: 0,
      };
    }

    const conversationIds = conversations.map((c) => c.id);

    // Get all messages with sources
    const messages = await db
      .select({
        conversationId: chatMessages.conversationId,
        sources: chatMessages.sources,
        tokenCount: chatMessages.tokenCount,
      })
      .from(chatMessages)
      .where(
        and(
          sql`${chatMessages.conversationId} = ANY(ARRAY[${sql.join(
            conversationIds.map((id) => sql`${id}::uuid`),
            sql`, `
          )}]::uuid[])`,
          eq(chatMessages.role, "assistant")
        )
      );

    // Get message counts per conversation
    const messageCounts = await db
      .select({
        conversationId: chatMessages.conversationId,
        count: count(),
      })
      .from(chatMessages)
      .where(
        sql`${chatMessages.conversationId} = ANY(ARRAY[${sql.join(
          conversationIds.map((id) => sql`${id}::uuid`),
          sql`, `
        )}]::uuid[])`
      )
      .groupBy(chatMessages.conversationId);

    const messageCountMap = new Map<string, number>();
    for (const mc of messageCounts) {
      messageCountMap.set(mc.conversationId, Number(mc.count));
    }

    let totalQuality = 0;
    let qualityCount = 0;
    let totalSources = 0;
    let sourceCount = 0;
    let conversationsWithFollowUp = 0;
    let conversationsReengaged = 0;

    for (const conv of conversations) {
      const messageCount = messageCountMap.get(conv.id) || 0;

      // Follow-up rate: conversations with more than 2 messages (user + assistant + follow-up)
      if (messageCount > 2) {
        conversationsWithFollowUp++;
      }

      // Re-engagement: conversations with more than 4 messages (multiple exchanges)
      if (messageCount > 4) {
        conversationsReengaged++;
      }
    }

    // Calculate quality score based on sources and token count
    for (const message of messages) {
      const sourceCountForMessage = message.sources
        ? (message.sources as unknown[]).length
        : 0;
      const tokens = message.tokenCount || 0;

      // Quality score: sources (weight 40%) + token count normalized (weight 60%)
      // Normalize tokens: assume 1000 tokens = 100 points
      const tokenScore = Math.min((tokens / 1000) * 100, 100);
      const sourceScore = Math.min(sourceCountForMessage * 20, 100);
      const quality = sourceScore * 0.4 + tokenScore * 0.6;

      totalQuality += quality;
      qualityCount++;

      if (sourceCountForMessage > 0) {
        totalSources += sourceCountForMessage;
        sourceCount++;
      }
    }

    const averageResponseQuality =
      qualityCount > 0
        ? Math.round((totalQuality / qualityCount) * 100) / 100
        : 0;

    const followUpRate =
      conversations.length > 0
        ? Math.round(
            (conversationsWithFollowUp / conversations.length) * 100 * 100
          ) / 100
        : 0;

    const reEngagementRate =
      conversations.length > 0
        ? Math.round(
            (conversationsReengaged / conversations.length) * 100 * 100
          ) / 100
        : 0;

    const averageSourcesPerResponse =
      sourceCount > 0
        ? Math.round((totalSources / sourceCount) * 100) / 100
        : 0;

    return {
      averageResponseQuality,
      followUpRate,
      reEngagementRate,
      averageSourcesPerResponse,
    };
  }
}

