import { err, ok } from "neverthrow";
import { logger } from "../../lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import { PrivilegedAccessQueries } from "../data-access/privileged-access.queries";
import { AuditLogService } from "./audit-log.service";

export interface PrivilegedAccessAlert {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  type: string;
  message: string;
  userId: string;
  userEmail: string;
  metadata: Record<string, unknown>;
  detectedAt: Date;
}

export class PrivilegedAccessService {
  private static readonly INACTIVE_DAYS_THRESHOLD = 90;
  private static readonly SUSPICIOUS_ACTION_THRESHOLD = 50;
  private static readonly FAILED_AUTH_THRESHOLD = 5;

  static async detectAnomalies(
    organizationId: string
  ): Promise<ActionResult<PrivilegedAccessAlert[]>> {
    try {
      const alerts: PrivilegedAccessAlert[] = [];

      const [privilegedUsers, stats] = await Promise.all([
        PrivilegedAccessQueries.getAllPrivilegedUsers(organizationId),
        PrivilegedAccessQueries.getPrivilegedAccessStats(organizationId),
      ]);

      const now = new Date();
      const inactiveThreshold = new Date(
        now.getTime() - this.INACTIVE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000
      );

      for (const user of privilegedUsers) {
        if (!user.lastActivity || user.lastActivity < inactiveThreshold) {
          alerts.push({
            id: `inactive-${user.id}`,
            severity: user.role === "superadmin" ? "critical" : "high",
            type: "inactive_privileged_account",
            message: `Privileged account ${user.email} (${user.role}) has been inactive for ${this.INACTIVE_DAYS_THRESHOLD}+ days`,
            userId: user.id,
            userEmail: user.email,
            metadata: {
              role: user.role,
              lastActivity: user.lastActivity?.toISOString() ?? null,
              daysSinceActivity: user.lastActivity
                ? Math.floor(
                    (now.getTime() - user.lastActivity.getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : null,
            },
            detectedAt: now,
          });
        }

        if (
          user.activityCount > this.SUSPICIOUS_ACTION_THRESHOLD &&
          user.lastActivity &&
          user.lastActivity > new Date(now.getTime() - 24 * 60 * 60 * 1000)
        ) {
          alerts.push({
            id: `high-activity-${user.id}`,
            severity: "medium",
            type: "high_privileged_activity",
            message: `Privileged account ${user.email} (${user.role}) has unusually high activity: ${user.activityCount} actions in last 24 hours`,
            userId: user.id,
            userEmail: user.email,
            metadata: {
              role: user.role,
              activityCount: user.activityCount,
              lastActivity: user.lastActivity.toISOString(),
            },
            detectedAt: now,
          });
        }
      }

      if (stats.recentRoleChanges > 10) {
        alerts.push({
          id: `role-change-spike-${organizationId}`,
          severity: "medium",
          type: "role_change_spike",
          message: `High number of role changes detected: ${stats.recentRoleChanges} changes in last 30 days`,
          userId: "system",
          userEmail: "system",
          metadata: {
            organizationId,
            roleChanges: stats.recentRoleChanges,
          },
          detectedAt: now,
        });
      }

      logger.info("Privileged access anomaly detection completed", {
        component: "PrivilegedAccessService",
        organizationId,
        alertsCount: alerts.length,
      });

      return ok(alerts);
    } catch (error) {
      logger.error(
        "Failed to detect privileged access anomalies",
        { organizationId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to detect anomalies",
          error as Error,
          "PrivilegedAccessService.detectAnomalies"
        )
      );
    }
  }

  static async logAdminAccess(params: {
    userId: string;
    organizationId: string;
    adminPage: string;
    ipAddress: string | null;
    userAgent: string | null;
  }): Promise<ActionResult<void>> {
    try {
      await AuditLogService.createAuditLog({
        eventType: "admin_access",
        resourceType: "admin_interface",
        resourceId: null,
        userId: params.userId,
        organizationId: params.organizationId,
        action: "read",
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: {
          adminPage: params.adminPage,
          accessType: "admin_interface",
        },
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to log admin access", params, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to log admin access",
          error as Error,
          "PrivilegedAccessService.logAdminAccess"
        )
      );
    }
  }

  static extractRequestInfo(headers: Headers): {
    ipAddress: string | null;
    userAgent: string | null;
  } {
    return AuditLogService.extractRequestInfo(headers);
  }

  static async logPrivilegedAction(params: {
    userId: string;
    organizationId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<ActionResult<void>> {
    try {
      await AuditLogService.createAuditLog({
        eventType: "privileged_action",
        resourceType: params.resourceType as never,
        resourceId: params.resourceId ?? null,
        userId: params.userId,
        organizationId: params.organizationId,
        action: params.action as never,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata ?? null,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to log privileged action", params, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to log privileged action",
          error as Error,
          "PrivilegedAccessService.logPrivilegedAction"
        )
      );
    }
  }

  static async generatePrivilegeReviewReport(
    organizationId: string
  ): Promise<
    ActionResult<{
      reviewDate: Date;
      privilegedUsers: Array<{
        id: string;
        email: string;
        name: string | null;
        role: string;
        lastActivity: Date | null;
        activityCount: number;
        recommendation: "keep" | "review" | "revoke";
        reason: string;
      }>;
      stats: {
        totalPrivileged: number;
        inactive: number;
        recommended_revocations: number;
      };
    }>
  > {
    try {
      const privilegedUsers =
        await PrivilegedAccessQueries.getAllPrivilegedUsers(organizationId);

      const now = new Date();
      const inactiveThreshold = new Date(
        now.getTime() - this.INACTIVE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000
      );

      const reviewedUsers = privilegedUsers.map((user) => {
        let recommendation: "keep" | "review" | "revoke" = "keep";
        let reason = "Active and justified";

        if (!user.lastActivity) {
          recommendation = "revoke";
          reason = "No activity recorded";
        } else if (user.lastActivity < inactiveThreshold) {
          recommendation = "revoke";
          const daysSinceActivity = Math.floor(
            (now.getTime() - user.lastActivity.getTime()) /
              (1000 * 60 * 60 * 24)
          );
          reason = `Inactive for ${daysSinceActivity} days`;
        } else if (user.activityCount < 5) {
          recommendation = "review";
          reason = "Low activity count";
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          lastActivity: user.lastActivity,
          activityCount: user.activityCount,
          recommendation,
          reason,
        };
      });

      const stats = {
        totalPrivileged: privilegedUsers.length,
        inactive: reviewedUsers.filter((u) => u.recommendation === "revoke")
          .length,
        recommended_revocations: reviewedUsers.filter(
          (u) => u.recommendation === "revoke"
        ).length,
      };

      logger.info("Generated privilege review report", {
        component: "PrivilegedAccessService",
        organizationId,
        totalPrivileged: stats.totalPrivileged,
        recommendedRevocations: stats.recommended_revocations,
      });

      return ok({
        reviewDate: now,
        privilegedUsers: reviewedUsers,
        stats,
      });
    } catch (error) {
      logger.error(
        "Failed to generate privilege review report",
        { organizationId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to generate review report",
          error as Error,
          "PrivilegedAccessService.generatePrivilegeReviewReport"
        )
      );
    }
  }
}
