import { createHash } from "crypto";
import { err, ok } from "neverthrow";
import { ActionErrors, type ActionResult } from "../../lib/action-errors";
import { logger } from "../../lib/logger";
import {
  AuditLogsQueries,
  type AuditLogFilters,
} from "../data-access/audit-logs.queries";
import {
  type AuditLog,
  type NewAuditLog,
} from "../db/schema";

/**
 * Comprehensive Audit Log Service
 * Handles audit logging with tamper-proofing via hash chain
 * Supports SOC 2 compliance requirements
 */

export interface CreateAuditLogParams {
  eventType: string;
  resourceType: string;
  resourceId?: string | null;
  userId: string;
  organizationId: string;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Compute hash for an audit log entry
 * Hash is computed from: previousHash + eventType + resourceType + resourceId + userId + organizationId + action + createdAt + metadata
 */
function computeHash(
  log: Pick<
    AuditLog,
    | "previousHash"
    | "eventType"
    | "resourceType"
    | "resourceId"
    | "userId"
    | "organizationId"
    | "action"
    | "createdAt"
    | "metadata"
  >
): string {
  const hashInput = JSON.stringify({
    previousHash: log.previousHash ?? "",
    eventType: log.eventType,
    resourceType: log.resourceType,
    resourceId: log.resourceId ?? "",
    userId: log.userId,
    organizationId: log.organizationId,
    action: log.action,
    createdAt: log.createdAt.toISOString(),
    metadata: log.metadata ?? {},
  });

  return createHash("sha256").update(hashInput).digest("hex");
}

export class AuditLogService {
  /**
   * Create a new audit log entry with hash chain
   */
  static async createAuditLog(
    params: CreateAuditLogParams
  ): Promise<ActionResult<AuditLog>> {
    try {
      // Get the latest log entry for this organization to get previous hash
      const latestLog = await AuditLogsQueries.getLatestLog(
        params.organizationId
      );

      const previousHash = latestLog?.hash ?? null;

      // Create the log entry (without hash first)
      const logEntry: Omit<NewAuditLog, "hash"> = {
        eventType: params.eventType as any,
        resourceType: params.resourceType as any,
        resourceId: params.resourceId ?? null,
        userId: params.userId,
        organizationId: params.organizationId,
        action: params.action as any,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        metadata: params.metadata ?? null,
        previousHash,
      };

      // Compute hash for this entry
      const hash = computeHash({
        ...logEntry,
        createdAt: new Date(), // Use current timestamp for hash computation
      });

      // Insert with hash
      const auditLog = await AuditLogsQueries.insert({
        ...logEntry,
        hash,
      } as NewAuditLog);

      logger.info("Audit log created", {
        component: "AuditLogService",
        auditLogId: auditLog.id,
        eventType: params.eventType,
        resourceType: params.resourceType,
        userId: params.userId,
        organizationId: params.organizationId,
      });

      return ok(auditLog);
    } catch (error) {
      logger.error(
        "Failed to create audit log",
        { params },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to create audit log",
          error as Error,
          "AuditLogService.createAuditLog"
        )
      );
    }
  }

  /**
   * Get audit logs with filters
   */
  static async getAuditLogs(
    organizationId: string,
    filters?: AuditLogFilters
  ): Promise<ActionResult<{ logs: AuditLog[]; total: number }>> {
    try {
      const [logs, total] = await Promise.all([
        AuditLogsQueries.findByFilters(organizationId, filters),
        AuditLogsQueries.countByFilters(organizationId, filters),
      ]);

      logger.info("Retrieved audit logs", {
        component: "AuditLogService",
        organizationId,
        count: logs.length,
        total,
        filters,
      });

      return ok({ logs, total });
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
          "AuditLogService.getAuditLogs"
        )
      );
    }
  }

  /**
   * Get audit logs for a specific resource
   */
  static async getAuditLogsByResource(
    resourceType: string,
    resourceId: string,
    organizationId: string,
    limit = 100
  ): Promise<ActionResult<AuditLog[]>> {
    try {
      const logs = await AuditLogsQueries.findByResource(
        resourceType,
        resourceId,
        organizationId,
        limit
      );

      return ok(logs);
    } catch (error) {
      logger.error(
        "Failed to retrieve audit logs by resource",
        { resourceType, resourceId, organizationId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to retrieve audit logs by resource",
          error as Error,
          "AuditLogService.getAuditLogsByResource"
        )
      );
    }
  }

  /**
   * Get audit logs for a specific user
   */
  static async getAuditLogsByUser(
    userId: string,
    organizationId: string,
    limit = 100
  ): Promise<ActionResult<AuditLog[]>> {
    try {
      const logs = await AuditLogsQueries.findByUser(
        userId,
        organizationId,
        limit
      );

      return ok(logs);
    } catch (error) {
      logger.error(
        "Failed to retrieve audit logs by user",
        { userId, organizationId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to retrieve audit logs by user",
          error as Error,
          "AuditLogService.getAuditLogsByUser"
        )
      );
    }
  }

  /**
   * Verify hash chain integrity for an organization
   * Returns logs with broken hash chain (indicating tampering)
   */
  static async verifyHashChain(
    organizationId: string
  ): Promise<ActionResult<Array<{ log: AuditLog; isValid: boolean }>>> {
    try {
      const results = await AuditLogsQueries.verifyHashChain(organizationId);
      const invalidLogs = results.filter((r) => !r.isValid);

      if (invalidLogs.length > 0) {
        logger.warn("Hash chain integrity check found invalid logs", {
          component: "AuditLogService",
          organizationId,
          invalidCount: invalidLogs.length,
        });
      }

      return ok(results);
    } catch (error) {
      logger.error(
        "Failed to verify hash chain",
        { organizationId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to verify hash chain",
          error as Error,
          "AuditLogService.verifyHashChain"
        )
      );
    }
  }

  /**
   * Helper method to extract IP address and user agent from request headers
   */
  static extractRequestInfo(headers: Headers): {
    ipAddress: string | null;
    userAgent: string | null;
  } {
    // Try to get IP from various headers (for proxies/load balancers)
    const forwardedFor = headers.get("x-forwarded-for");
    const realIp = headers.get("x-real-ip");
    const cfConnectingIp = headers.get("cf-connecting-ip");

    const ipAddress =
      forwardedFor?.split(",")[0]?.trim() ||
      realIp ||
      cfConnectingIp ||
      null;

    const userAgent = headers.get("user-agent") || null;

    return { ipAddress, userAgent };
  }
}

