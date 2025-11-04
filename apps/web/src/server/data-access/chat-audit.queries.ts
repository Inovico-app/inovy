import { type Result, err, ok } from "neverthrow";
import { db } from "../db";
import { chatAuditLog, type NewChatAuditLog, type ChatAuditLog } from "../db/schema";
import { logger } from "../../lib/logger";
import { eq, and, desc, gte } from "drizzle-orm";

/**
 * Chat Audit Data Access Layer
 * Direct database operations for chat audit logging
 */

export interface AuditLogFilters {
  userId?: string;
  chatContext?: "project" | "organization";
  action?: "access_granted" | "access_denied" | "query_executed";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

/**
 * Insert a new audit log entry
 */
export async function insertAuditLog(
  logEntry: NewChatAuditLog
): Promise<Result<void, string>> {
  try {
    await db.insert(chatAuditLog).values(logEntry);
    return ok(undefined);
  } catch (error) {
    const errorMessage = "Failed to insert audit log";
    logger.error(errorMessage, { logEntry }, error as Error);
    return err(errorMessage);
  }
}

/**
 * Get audit logs for an organization with optional filters
 */
export async function getAuditLogsByOrganization(
  organizationId: string,
  filters?: AuditLogFilters
): Promise<Result<ChatAuditLog[], string>> {
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

    if (filters?.startDate) {
      conditions.push(gte(chatAuditLog.createdAt, filters.startDate));
    }

    const query = db
      .select()
      .from(chatAuditLog)
      .where(and(...conditions))
      .orderBy(desc(chatAuditLog.createdAt))
      .limit(filters?.limit ?? 100);

    const logs = await query;

    return ok(logs);
  } catch (error) {
    const errorMessage = "Failed to retrieve audit logs";
    logger.error(errorMessage, { organizationId, filters }, error as Error);
    return err(errorMessage);
  }
}

/**
 * Get access denial logs for a user
 */
export async function getAccessDenialLogs(
  userId: string,
  organizationId: string,
  since?: Date
): Promise<Result<ChatAuditLog[], string>> {
  try {
    const conditions = [
      eq(chatAuditLog.userId, userId),
      eq(chatAuditLog.organizationId, organizationId),
      eq(chatAuditLog.action, "access_denied"),
    ];

    if (since) {
      conditions.push(gte(chatAuditLog.createdAt, since));
    }

    const logs = await db
      .select()
      .from(chatAuditLog)
      .where(and(...conditions))
      .orderBy(desc(chatAuditLog.createdAt));

    return ok(logs);
  } catch (error) {
    const errorMessage = "Failed to get access denial logs";
    logger.error(errorMessage, { userId, organizationId }, error as Error);
    return err(errorMessage);
  }
}

/**
 * Get audit logs by user
 */
export async function getAuditLogsByUser(
  userId: string,
  organizationId: string,
  limit = 100
): Promise<Result<ChatAuditLog[], string>> {
  try {
    const logs = await db
      .select()
      .from(chatAuditLog)
      .where(
        and(
          eq(chatAuditLog.userId, userId),
          eq(chatAuditLog.organizationId, organizationId)
        )
      )
      .orderBy(desc(chatAuditLog.createdAt))
      .limit(limit);

    return ok(logs);
  } catch (error) {
    const errorMessage = "Failed to get user audit logs";
    logger.error(errorMessage, { userId, organizationId }, error as Error);
    return err(errorMessage);
  }
}

