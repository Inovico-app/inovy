import { type Result, err, ok } from "neverthrow";
import { db } from "../db";
import { chatAuditLog, type NewChatAuditLog } from "../db/schema";
import { logger } from "../../lib/logger";
import { eq, and, desc } from "drizzle-orm";

/**
 * Chat Audit Service
 * Handles logging of all chat access attempts and queries for security and compliance
 */

export interface ChatAccessLogParams {
  userId: string;
  organizationId: string;
  chatContext: "project" | "organization";
  projectId?: string;
  granted: boolean;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatQueryLogParams {
  userId: string;
  organizationId: string;
  chatContext: "project" | "organization";
  query: string;
  projectId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilters {
  userId?: string;
  chatContext?: "project" | "organization";
  action?: "access_granted" | "access_denied" | "query_executed";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class ChatAuditService {
  /**
   * Log a chat access attempt (granted or denied)
   */
  static async logChatAccess(
    params: ChatAccessLogParams
  ): Promise<Result<void, string>> {
    try {
      const action = params.granted ? "access_granted" : "access_denied";

      const logEntry: NewChatAuditLog = {
        userId: params.userId,
        organizationId: params.organizationId,
        chatContext: params.chatContext,
        projectId: params.projectId ?? null,
        action,
        query: null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        metadata: params.metadata ?? null,
      };

      await db.insert(chatAuditLog).values(logEntry);

      logger.info("Chat access logged", {
        userId: params.userId,
        organizationId: params.organizationId,
        chatContext: params.chatContext,
        action,
      });

      return ok(undefined);
    } catch (error) {
      const errorMessage = "Failed to log chat access";
      logger.error(errorMessage, { params }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Log a chat query execution
   */
  static async logChatQuery(
    params: ChatQueryLogParams
  ): Promise<Result<void, string>> {
    try {
      const logEntry: NewChatAuditLog = {
        userId: params.userId,
        organizationId: params.organizationId,
        chatContext: params.chatContext,
        projectId: params.projectId ?? null,
        action: "query_executed",
        query: params.query,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        metadata: params.metadata ?? null,
      };

      await db.insert(chatAuditLog).values(logEntry);

      logger.info("Chat query logged", {
        userId: params.userId,
        organizationId: params.organizationId,
        chatContext: params.chatContext,
        queryLength: params.query.length,
      });

      return ok(undefined);
    } catch (error) {
      const errorMessage = "Failed to log chat query";
      logger.error(errorMessage, { params }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get audit logs for an organization with optional filters
   */
  static async getAuditLogs(
    organizationId: string,
    filters?: AuditLogFilters
  ): Promise<Result<typeof chatAuditLog.$inferSelect[], string>> {
    try {
      const conditions = [eq(chatAuditLog.organizationId, organizationId)];

      if (filters?.userId) {
        conditions.push(eq(chatAuditLog.userId, filters.userId));
      }

      if (filters?.chatContext) {
        conditions.push(eq(chatAuditLog.chatContext, filters.chatContext));
      }

      if (filters?.action) {
        conditions.push(eq(chatAuditLog.action, filters.action));
      }

      const query = db
        .select()
        .from(chatAuditLog)
        .where(and(...conditions))
        .orderBy(desc(chatAuditLog.createdAt))
        .limit(filters?.limit ?? 100);

      const logs = await query;

      logger.info("Retrieved audit logs", {
        organizationId,
        count: logs.length,
        filters,
      });

      return ok(logs);
    } catch (error) {
      const errorMessage = "Failed to retrieve audit logs";
      logger.error(errorMessage, { organizationId, filters }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get access denial count for a user (for monitoring/alerting)
   */
  static async getAccessDenialCount(
    userId: string,
    organizationId: string,
    since?: Date
  ): Promise<Result<number, string>> {
    try {
      const conditions = [
        eq(chatAuditLog.userId, userId),
        eq(chatAuditLog.organizationId, organizationId),
        eq(chatAuditLog.action, "access_denied"),
      ];

      const logs = await db
        .select()
        .from(chatAuditLog)
        .where(and(...conditions));

      const count = since
        ? logs.filter((log) => log.createdAt >= since).length
        : logs.length;

      return ok(count);
    } catch (error) {
      const errorMessage = "Failed to get access denial count";
      logger.error(errorMessage, { userId, organizationId }, error as Error);
      return err(errorMessage);
    }
  }
}

