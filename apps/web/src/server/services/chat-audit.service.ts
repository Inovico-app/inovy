import { err, ok } from "neverthrow";
import { logger } from "../../lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import {
  ChatAuditQueries,
  type AuditLogFilters,
} from "../data-access/chat-audit.queries";
import { type NewChatAuditLog } from "../db/schema/chat-audit-log";

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
  ): Promise<ActionResult<void>> {
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

      await ChatAuditQueries.insert(logEntry);

      logger.info("Chat access logged", {
        userId: params.userId,
        organizationId: params.organizationId,
        chatContext: params.chatContext,
        action,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to log chat access", { params }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to log chat access",
          error as Error,
          "ChatAuditService.logChatAccess"
        )
      );
    }
  }

  /**
   * Log a chat query execution
   */
  static async logChatQuery(
    params: ChatQueryLogParams
  ): Promise<ActionResult<void>> {
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

      await ChatAuditQueries.insert(logEntry);

      logger.info("Chat query logged", {
        userId: params.userId,
        organizationId: params.organizationId,
        chatContext: params.chatContext,
        queryLength: params.query.length,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to log chat query", { params }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to log chat query",
          error as Error,
          "ChatAuditService.logChatQuery"
        )
      );
    }
  }

  /**
   * Get audit logs for an organization with optional filters
   */
  static async getAuditLogs(
    organizationId: string,
    filters?: AuditLogFilters
  ): Promise<
    ActionResult<
      Awaited<ReturnType<typeof ChatAuditQueries.findByOrganization>>
    >
  > {
    try {
      const logs = await ChatAuditQueries.findByOrganization(
        organizationId,
        filters
      );

      logger.info("Retrieved audit logs", {
        organizationId,
        count: logs.length,
        filters,
      });

      return ok(logs);
    } catch (error) {
      logger.error(
        "Failed to retrieve audit logs",
        { organizationId, filters },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to retrieve audit logs",
          error as Error,
          "ChatAuditService.getAuditLogs"
        )
      );
    }
  }

  /**
   * Get access denial count for a user (for monitoring/alerting)
   */
  static async getAccessDenialCount(
    userId: string,
    organizationId: string,
    since?: Date
  ): Promise<ActionResult<number>> {
    try {
      const denials = await ChatAuditQueries.findAccessDenials(
        userId,
        organizationId,
        since
      );

      return ok(denials.length);
    } catch (error) {
      logger.error(
        "Failed to get access denial count",
        { userId, organizationId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get access denial count",
          error as Error,
          "ChatAuditService.getAccessDenialCount"
        )
      );
    }
  }
}

