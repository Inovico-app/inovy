import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "../db";
import {
  chatAuditLog,
  type ChatAuditLog,
  type NewChatAuditLog,
} from "../db/schema";

export interface AuditLogFilters {
  userId?: string;
  chatContext?: "project" | "organization";
  action?: "access_granted" | "access_denied" | "query_executed";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class ChatAuditQueries {
  static async insert(logEntry: NewChatAuditLog): Promise<void> {
    await db.insert(chatAuditLog).values(logEntry);
  }

  static async findByOrganization(
    organizationId: string,
    filters?: AuditLogFilters
  ): Promise<ChatAuditLog[]> {
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
    return db
      .select()
      .from(chatAuditLog)
      .where(and(...conditions))
      .orderBy(desc(chatAuditLog.createdAt))
      .limit(filters?.limit ?? 100);
  }

  static async findAccessDenials(
    userId: string,
    organizationId: string,
    since?: Date
  ): Promise<ChatAuditLog[]> {
    const conditions = [
      eq(chatAuditLog.userId, userId),
      eq(chatAuditLog.organizationId, organizationId),
      eq(chatAuditLog.action, "access_denied"),
    ];
    if (since) {
      conditions.push(gte(chatAuditLog.createdAt, since));
    }
    return db
      .select()
      .from(chatAuditLog)
      .where(and(...conditions))
      .orderBy(desc(chatAuditLog.createdAt));
  }

  static async findByUser(
    userId: string,
    organizationId: string,
    limit = 100
  ): Promise<ChatAuditLog[]> {
    return db
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
  }

  static async findByAction(
    organizationId: string,
    action: "access_granted" | "access_denied" | "query_executed",
    limit = 100
  ): Promise<ChatAuditLog[]> {
    return db
      .select()
      .from(chatAuditLog)
      .where(
        and(
          eq(chatAuditLog.organizationId, organizationId),
          eq(chatAuditLog.action, action)
        )
      )
      .orderBy(desc(chatAuditLog.createdAt))
      .limit(limit);
  }
}

