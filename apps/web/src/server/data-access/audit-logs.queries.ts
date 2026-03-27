import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../db";
import {
  auditLogs,
  type AuditLog,
  type NewAuditLog,
} from "../db/schema/audit-logs";
import { computeHash } from "../services/audit-log.service";

type AuditEventType = AuditLog["eventType"];
type AuditResourceType = AuditLog["resourceType"];
type AuditAction = AuditLog["action"];

export interface AuditLogFilters {
  userId?: string;
  organizationId?: string;
  eventType?: AuditEventType[];
  resourceType?: AuditResourceType[];
  action?: AuditAction[];
  category?: ("mutation" | "read")[];
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditLogsQueries {
  /**
   * Insert a new audit log entry
   * Note: Hash should be computed before calling this method
   */
  static async insert(logEntry: NewAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(logEntry).returning();
    return log;
  }

  /**
   * Atomically fetch the latest log, compute the hash, and insert a new entry
   * within a transaction. Prevents hash chain race conditions when concurrent
   * inserts target the same org. Hash is computed inside the transaction after
   * `previousHash` is resolved so the stored hash is always correct.
   */
  static async insertWithChain(
    logEntry: Omit<NewAuditLog, "hash" | "previousHash"> & {
      previousHash?: string;
    },
  ): Promise<AuditLog> {
    const result = await db.transaction(async (tx) => {
      const [lastLog] = await tx
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.organizationId, logEntry.organizationId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(1);

      const previousHash = lastLog?.hash ?? "genesis";

      const hash = computeHash({
        eventType: logEntry.eventType,
        resourceType: logEntry.resourceType,
        resourceId: logEntry.resourceId ?? null,
        userId: logEntry.userId,
        organizationId: logEntry.organizationId,
        action: logEntry.action,
        category: logEntry.category ?? "mutation",
        createdAt: logEntry.createdAt ?? new Date(),
        metadata: logEntry.metadata ?? null,
      });

      const [inserted] = await tx
        .insert(auditLogs)
        .values({ ...logEntry, previousHash, hash })
        .returning();
      return inserted;
    });
    return result;
  }

  /**
   * Get the most recent audit log entry (for hash chain)
   */
  static async getLatestLog(organizationId: string): Promise<AuditLog | null> {
    const [log] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, organizationId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(1);
    return log ?? null;
  }

  /**
   * Find audit logs with filters
   */
  static async findByFilters(
    organizationId: string,
    filters?: AuditLogFilters,
  ): Promise<AuditLog[]> {
    const conditions = [eq(auditLogs.organizationId, organizationId)];

    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }

    if (filters?.eventType && filters.eventType.length > 0) {
      conditions.push(inArray(auditLogs.eventType, filters.eventType));
    }

    if (filters?.resourceType && filters.resourceType.length > 0) {
      conditions.push(inArray(auditLogs.resourceType, filters.resourceType));
    }

    if (filters?.action && filters.action.length > 0) {
      conditions.push(inArray(auditLogs.action, filters.action));
    }

    if (filters?.category && filters.category.length > 0) {
      conditions.push(inArray(auditLogs.category, filters.category));
    }

    if (filters?.resourceId) {
      conditions.push(eq(auditLogs.resourceId, filters.resourceId));
    }

    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }

    const query = db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt));

    if (filters?.limit) {
      return query.limit(filters.limit);
    }

    if (filters?.offset) {
      return query.offset(filters.offset);
    }

    return query;
  }

  /**
   * Count audit logs with filters
   */
  static async countByFilters(
    organizationId: string,
    filters?: Omit<AuditLogFilters, "limit" | "offset">,
  ): Promise<number> {
    const conditions = [eq(auditLogs.organizationId, organizationId)];

    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }

    if (filters?.eventType && filters.eventType.length > 0) {
      conditions.push(inArray(auditLogs.eventType, filters.eventType));
    }

    if (filters?.resourceType && filters.resourceType.length > 0) {
      conditions.push(inArray(auditLogs.resourceType, filters.resourceType));
    }

    if (filters?.action && filters.action.length > 0) {
      conditions.push(inArray(auditLogs.action, filters.action));
    }

    if (filters?.category && filters.category.length > 0) {
      conditions.push(inArray(auditLogs.category, filters.category));
    }

    if (filters?.resourceId) {
      conditions.push(eq(auditLogs.resourceId, filters.resourceId));
    }

    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(and(...conditions));

    return Number(result[0]?.count ?? 0);
  }

  /**
   * Find audit logs by resource
   */
  static async findByResource(
    resourceType: AuditResourceType,
    resourceId: string,
    organizationId: string,
    limit = 100,
  ): Promise<AuditLog[]> {
    return db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.resourceType, resourceType),
          eq(auditLogs.resourceId, resourceId),
          eq(auditLogs.organizationId, organizationId),
        ),
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  /**
   * Find audit logs by user
   */
  static async findByUser(
    userId: string,
    organizationId: string,
    limit = 100,
  ): Promise<AuditLog[]> {
    return db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.userId, userId),
          eq(auditLogs.organizationId, organizationId),
        ),
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  /**
   * Find audit logs by event type
   */
  static async findByEventType(
    eventType: AuditEventType,
    organizationId: string,
    limit = 100,
  ): Promise<AuditLog[]> {
    return db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.eventType, eventType),
          eq(auditLogs.organizationId, organizationId),
        ),
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  /**
   * Verify hash integrity for an organization
   * Recomputes each record's hash individually and compares against stored hash
   */
  static async verifyHashChain(
    organizationId: string,
  ): Promise<Array<{ log: AuditLog; isValid: boolean }>> {
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, organizationId))
      .orderBy(auditLogs.createdAt);

    const results: Array<{ log: AuditLog; isValid: boolean }> = [];

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i]!;

      // Verify individual hash
      const recomputedHash = computeHash({
        eventType: log.eventType,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        userId: log.userId,
        organizationId: log.organizationId,
        action: log.action,
        category: log.category,
        createdAt: log.createdAt,
        metadata: log.metadata,
      });
      const hashValid = log.hash === recomputedHash;

      // Verify chain linkage
      let chainValid = true;
      if (i === 0) {
        // TODO: After running backfill-audit-hash-chain.ts, remove null tolerance
        // and treat null previousHash on non-genesis entries as invalid
        chainValid =
          log.previousHash === "genesis" || log.previousHash === null;
      } else {
        const prevLog = logs[i - 1]!;
        // TODO: After running backfill-audit-hash-chain.ts, remove null tolerance
        // and treat null previousHash on non-genesis entries as invalid
        chainValid =
          log.previousHash === prevLog.hash || log.previousHash === null;
      }

      results.push({ log, isValid: hashValid && chainValid });
    }

    return results;
  }

  /**
   * Anonymize audit logs by replacing userId with anonymized ID
   */
  static async anonymizeByUserId(
    userId: string,
    organizationId: string,
    anonymizedId: string,
  ): Promise<void> {
    await db
      .update(auditLogs)
      .set({
        userId: anonymizedId,
      })
      .where(
        and(
          eq(auditLogs.userId, userId),
          eq(auditLogs.organizationId, organizationId),
        ),
      );
  }
}
