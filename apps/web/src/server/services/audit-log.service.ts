import { createHash } from "crypto";
import { err, ok } from "neverthrow";
import { logger } from "../../lib/logger";
import {
  assertOrganizationAccess,
  validateOrganizationContext,
} from "../../lib/rbac/organization-isolation";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import {
  AuditLogsQueries,
  type AuditLogFilters,
} from "../data-access/audit-logs.queries";
import { type AuditLog, type NewAuditLog } from "../db/schema/audit-logs";

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
        eventType: params.eventType as NewAuditLog["eventType"],
        resourceType: params.resourceType as NewAuditLog["resourceType"],
        resourceId: params.resourceId ?? null,
        userId: params.userId,
        organizationId: params.organizationId,
        action: params.action as NewAuditLog["action"],
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        metadata: params.metadata ?? null,
        previousHash,
      };

      // Compute hash for this entry
      const hash = computeHash({
        previousHash: logEntry.previousHash ?? null,
        eventType: logEntry.eventType,
        resourceType: logEntry.resourceType,
        resourceId: logEntry.resourceId ?? null,
        userId: logEntry.userId,
        organizationId: logEntry.organizationId,
        action: logEntry.action,
        createdAt: new Date(), // Use current timestamp for hash computation
        metadata: logEntry.metadata ?? null,
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
      logger.error("Failed to create audit log", { params }, error as Error);
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
   * Enforces organization isolation - only returns logs for the specified organization
   */
  static async getAuditLogs(
    organizationId: string,
    filters?: AuditLogFilters
  ): Promise<ActionResult<{ logs: AuditLog[]; total: number }>> {
    try {
      // Validate organization access before making any queries
      const orgContext = await validateOrganizationContext(
        "AuditLogService.getAuditLogs"
      );
      if (orgContext.isErr()) {
        return err(orgContext.error);
      }

      // Verify user belongs to the organization they're querying
      try {
        assertOrganizationAccess(
          organizationId,
          orgContext.value.organizationId,
          "AuditLogService.getAuditLogs"
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Audit logs not found",
            "AuditLogService.getAuditLogs"
          )
        );
      }

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
   * Enforces organization isolation - only returns logs for the specified organization
   */
  static async getAuditLogsByResource(
    resourceType: string,
    resourceId: string,
    organizationId: string,
    limit = 100
  ): Promise<ActionResult<AuditLog[]>> {
    try {
      // Validate organization access before making any queries
      const orgContext = await validateOrganizationContext(
        "AuditLogService.getAuditLogsByResource"
      );
      if (orgContext.isErr()) {
        return err(orgContext.error);
      }

      // Verify user belongs to the organization they're querying
      try {
        assertOrganizationAccess(
          organizationId,
          orgContext.value.organizationId,
          "AuditLogService.getAuditLogsByResource"
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Audit logs not found",
            "AuditLogService.getAuditLogsByResource"
          )
        );
      }

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
   * Enforces organization isolation - only returns logs for the specified organization
   */
  static async getAuditLogsByUser(
    userId: string,
    organizationId: string,
    limit = 100
  ): Promise<ActionResult<AuditLog[]>> {
    try {
      // Validate organization access before making any queries
      const orgContext = await validateOrganizationContext(
        "AuditLogService.getAuditLogsByUser"
      );
      if (orgContext.isErr()) {
        return err(orgContext.error);
      }

      // Verify user belongs to the organization they're querying
      try {
        assertOrganizationAccess(
          organizationId,
          orgContext.value.organizationId,
          "AuditLogService.getAuditLogsByUser"
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Audit logs not found",
            "AuditLogService.getAuditLogsByUser"
          )
        );
      }

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
   * Enforces organization isolation - only verifies logs for the specified organization
   */
  static async verifyHashChain(
    organizationId: string
  ): Promise<ActionResult<Array<{ log: AuditLog; isValid: boolean }>>> {
    try {
      // Validate organization access before making any queries
      const orgContext = await validateOrganizationContext(
        "AuditLogService.verifyHashChain"
      );
      if (orgContext.isErr()) {
        return err(orgContext.error);
      }

      // Verify user belongs to the organization they're querying
      try {
        assertOrganizationAccess(
          organizationId,
          orgContext.value.organizationId,
          "AuditLogService.verifyHashChain"
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Audit logs not found",
            "AuditLogService.verifyHashChain"
          )
        );
      }

      const results = await AuditLogsQueries.verifyHashChain(organizationId);

      const invalidHashLogs = results.filter((r) => !r.isValid);
      if (invalidHashLogs.length > 0) {
        logger.warn("Hash chain integrity check found invalid logs", {
          component: "AuditLogService",
          organizationId,
          invalidCount: invalidHashLogs.length,
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
      forwardedFor?.split(",")[0]?.trim() ?? realIp ?? cfConnectingIp ?? null;

    const userAgent = headers.get("user-agent") ?? null;

    return { ipAddress, userAgent };
  }
}

