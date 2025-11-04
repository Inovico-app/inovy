import { err, ok, type Result } from "neverthrow";
import { logger } from "../../lib/logger";
import {
  ChatAuditQueries,
  type AuditLogFilters,
} from "../data-access/chat-audit.queries";
import { type NewChatAuditLog } from "../db/schema";

/**
 * Chat Audit Service
 * Business logic for chat access logging and audit trail management
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

export class ChatAuditService {
  /**
   * Log a chat access attempt (granted or denied)
   */
  static async logChatAccess(
    params: ChatAccessLogParams
  ): Promise<Result<void, string>> {
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

    const result = await ChatAuditQueries.insert(logEntry);

    if (result.isErr()) {
      return err(result.error);
    }

    logger.info("Chat access logged", {
      userId: params.userId,
      organizationId: params.organizationId,
      chatContext: params.chatContext,
      action,
    });

    return ok(undefined);
  }

  /**
   * Log a chat query execution
   */
  static async logChatQuery(
    params: ChatQueryLogParams
  ): Promise<Result<void, string>> {
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

    const result = await ChatAuditQueries.insert(logEntry);

    if (result.isErr()) {
      return err(result.error);
    }

    logger.info("Chat query logged", {
      userId: params.userId,
      organizationId: params.organizationId,
      chatContext: params.chatContext,
      queryLength: params.query.length,
    });

    return ok(undefined);
  }

  /**
   * Get audit logs for an organization with optional filters
   */
  static async getAuditLogs(organizationId: string, filters?: AuditLogFilters) {
    const result = await ChatAuditQueries.findByOrganization(
      organizationId,
      filters
    );

    if (result.isErr()) {
      return err(result.error);
    }

    logger.info("Retrieved audit logs", {
      organizationId,
      count: result.value.length,
      filters,
    });

    return ok(result.value);
  }

  /**
   * Get access denial count for a user (for monitoring/alerting)
   */
  static async getAccessDenialCount(
    userId: string,
    organizationId: string,
    since?: Date
  ): Promise<Result<number, string>> {
    const result = await ChatAuditQueries.findAccessDenials(
      userId,
      organizationId,
      since
    );

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value.length);
  }
}
