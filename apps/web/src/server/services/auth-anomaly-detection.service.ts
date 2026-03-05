import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import { auditLogs } from "@/server/db/schema/audit-logs";
import { sessions } from "@/server/db/schema/auth";
import { and, desc, eq, gte } from "drizzle-orm";

export interface LoginAttempt {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
  success: boolean;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  riskLevel: "low" | "medium" | "high";
  reasons: string[];
  recommendedAction: "allow" | "require_2fa" | "block";
}

export class AuthAnomalyDetectionService {
  private static readonly ANALYSIS_WINDOW_DAYS = 30;
  private static readonly RAPID_LOGIN_THRESHOLD_MINUTES = 5;
  private static readonly MAX_FAILED_ATTEMPTS = 5;

  static async analyzeLoginAttempt(
    attempt: LoginAttempt
  ): Promise<AnomalyDetectionResult> {
    const reasons: string[] = [];
    let riskLevel: "low" | "medium" | "high" = "low";

    const historicalSessions = await this.getRecentSessions(
      attempt.userId,
      this.ANALYSIS_WINDOW_DAYS
    );

    const recentAuditLogs = await this.getRecentLoginAuditLogs(
      attempt.userId,
      this.ANALYSIS_WINDOW_DAYS
    );

    const locationCheck = this.checkLocationAnomaly(
      attempt.ipAddress,
      historicalSessions
    );
    if (locationCheck.isAnomaly) {
      reasons.push(locationCheck.reason);
      riskLevel = this.escalateRiskLevel(riskLevel, locationCheck.riskLevel);
    }

    const deviceCheck = this.checkDeviceAnomaly(
      attempt.userAgent,
      historicalSessions
    );
    if (deviceCheck.isAnomaly) {
      reasons.push(deviceCheck.reason);
      riskLevel = this.escalateRiskLevel(riskLevel, deviceCheck.riskLevel);
    }

    const rapidLoginCheck = await this.checkRapidLoginAttempts(
      attempt.userId,
      recentAuditLogs
    );
    if (rapidLoginCheck.isAnomaly) {
      reasons.push(rapidLoginCheck.reason);
      riskLevel = this.escalateRiskLevel(riskLevel, rapidLoginCheck.riskLevel);
    }

    const failedAttemptsCheck = await this.checkFailedLoginAttempts(
      attempt.userId,
      recentAuditLogs
    );
    if (failedAttemptsCheck.isAnomaly) {
      reasons.push(failedAttemptsCheck.reason);
      riskLevel = this.escalateRiskLevel(
        riskLevel,
        failedAttemptsCheck.riskLevel
      );
    }

    const inactivityCheck = this.checkInactivityAnomaly(historicalSessions);
    if (inactivityCheck.isAnomaly) {
      reasons.push(inactivityCheck.reason);
      riskLevel = this.escalateRiskLevel(riskLevel, inactivityCheck.riskLevel);
    }

    const isAnomaly = reasons.length > 0;

    const recommendedAction = this.determineRecommendedAction(
      riskLevel,
      reasons
    );

    if (isAnomaly) {
      logger.security.suspiciousActivity("Login anomaly detected", {
        userId: attempt.userId,
        riskLevel,
        reasons: reasons.join(", "),
        recommendedAction,
        ipAddress: attempt.ipAddress ?? "unknown",
        userAgent: attempt.userAgent ?? "unknown",
      });
    }

    return {
      isAnomaly,
      riskLevel,
      reasons,
      recommendedAction,
    };
  }

  private static async getRecentSessions(
    userId: string,
    days: number
  ): Promise<typeof sessions.$inferSelect[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), gte(sessions.createdAt, cutoffDate)))
      .orderBy(desc(sessions.createdAt))
      .limit(100);
  }

  private static async getRecentLoginAuditLogs(
    userId: string,
    days: number
  ): Promise<typeof auditLogs.$inferSelect[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.userId, userId),
          eq(auditLogs.eventType, "user_login"),
          gte(auditLogs.createdAt, cutoffDate)
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);
  }

  private static checkLocationAnomaly(
    currentIp: string | null,
    historicalSessions: typeof sessions.$inferSelect[]
  ): {
    isAnomaly: boolean;
    reason: string;
    riskLevel: "low" | "medium" | "high";
  } {
    if (!currentIp || historicalSessions.length === 0) {
      return { isAnomaly: false, reason: "", riskLevel: "low" };
    }

    const uniqueIps = new Set(
      historicalSessions
        .map((s) => s.ipAddress)
        .filter((ip): ip is string => ip !== null)
    );

    if (uniqueIps.size === 0) {
      return { isAnomaly: false, reason: "", riskLevel: "low" };
    }

    const isNewIp = !uniqueIps.has(currentIp);

    if (isNewIp) {
      return {
        isAnomaly: true,
        reason: "Login from new IP address",
        riskLevel: uniqueIps.size < 3 ? "medium" : "low",
      };
    }

    return { isAnomaly: false, reason: "", riskLevel: "low" };
  }

  private static checkDeviceAnomaly(
    currentUserAgent: string | null,
    historicalSessions: typeof sessions.$inferSelect[]
  ): {
    isAnomaly: boolean;
    reason: string;
    riskLevel: "low" | "medium" | "high";
  } {
    if (!currentUserAgent || historicalSessions.length === 0) {
      return { isAnomaly: false, reason: "", riskLevel: "low" };
    }

    const uniqueUserAgents = new Set(
      historicalSessions
        .map((s) => s.userAgent)
        .filter((ua): ua is string => ua !== null)
    );

    if (uniqueUserAgents.size === 0) {
      return { isAnomaly: false, reason: "", riskLevel: "low" };
    }

    const isNewDevice = !uniqueUserAgents.has(currentUserAgent);

    if (isNewDevice) {
      return {
        isAnomaly: true,
        reason: "Login from new device",
        riskLevel: "medium",
      };
    }

    return { isAnomaly: false, reason: "", riskLevel: "low" };
  }

  private static async checkRapidLoginAttempts(
    userId: string,
    recentAuditLogs: typeof auditLogs.$inferSelect[]
  ): Promise<{
    isAnomaly: boolean;
    reason: string;
    riskLevel: "low" | "medium" | "high";
  }> {
    if (recentAuditLogs.length < 2) {
      return { isAnomaly: false, reason: "", riskLevel: "low" };
    }

    const now = Date.now();
    const recentLogins = recentAuditLogs.filter(
      (log) =>
        now - log.createdAt.getTime() <
        this.RAPID_LOGIN_THRESHOLD_MINUTES * 60 * 1000
    );

    if (recentLogins.length >= 3) {
      return {
        isAnomaly: true,
        reason: `Multiple login attempts within ${this.RAPID_LOGIN_THRESHOLD_MINUTES} minutes`,
        riskLevel: "high",
      };
    }

    return { isAnomaly: false, reason: "", riskLevel: "low" };
  }

  private static async checkFailedLoginAttempts(
    userId: string,
    recentAuditLogs: typeof auditLogs.$inferSelect[]
  ): Promise<{
    isAnomaly: boolean;
    reason: string;
    riskLevel: "low" | "medium" | "high";
  }> {
    const failedAttempts = recentAuditLogs.filter((log) => {
      if (!log.metadata || typeof log.metadata !== "object") {
        return false;
      }
      const metadata = log.metadata as Record<string, unknown>;
      return metadata.success === false;
    });

    if (failedAttempts.length >= this.MAX_FAILED_ATTEMPTS) {
      return {
        isAnomaly: true,
        reason: `${failedAttempts.length} failed login attempts detected`,
        riskLevel: "high",
      };
    }

    return { isAnomaly: false, reason: "", riskLevel: "low" };
  }

  private static checkInactivityAnomaly(
    historicalSessions: typeof sessions.$inferSelect[]
  ): {
    isAnomaly: boolean;
    reason: string;
    riskLevel: "low" | "medium" | "high";
  } {
    if (historicalSessions.length === 0) {
      return { isAnomaly: false, reason: "", riskLevel: "low" };
    }

    const mostRecentSession = historicalSessions[0];
    if (!mostRecentSession) {
      return { isAnomaly: false, reason: "", riskLevel: "low" };
    }

    const daysSinceLastLogin =
      (Date.now() - mostRecentSession.createdAt.getTime()) /
      (1000 * 60 * 60 * 24);

    if (daysSinceLastLogin > 90) {
      return {
        isAnomaly: true,
        reason: "Login after extended inactivity period",
        riskLevel: "medium",
      };
    }

    return { isAnomaly: false, reason: "", riskLevel: "low" };
  }

  private static escalateRiskLevel(
    current: "low" | "medium" | "high",
    detected: "low" | "medium" | "high"
  ): "low" | "medium" | "high" {
    const levels = { low: 1, medium: 2, high: 3 };
    return levels[detected] > levels[current] ? detected : current;
  }

  private static determineRecommendedAction(
    riskLevel: "low" | "medium" | "high",
    reasons: string[]
  ): "allow" | "require_2fa" | "block" {
    if (riskLevel === "high" || reasons.length >= 3) {
      return "block";
    }

    if (riskLevel === "medium" || reasons.length >= 1) {
      return "require_2fa";
    }

    return "allow";
  }

  static async logLoginAttempt(
    userId: string,
    organizationId: string | null,
    success: boolean,
    ipAddress: string | null,
    userAgent: string | null,
    anomalyResult?: AnomalyDetectionResult
  ): Promise<void> {
    try {
      const metadata: Record<string, unknown> = {
        success,
        ipAddress: ipAddress ?? "unknown",
        userAgent: userAgent ?? "unknown",
      };

      if (anomalyResult) {
        metadata.anomaly = {
          detected: anomalyResult.isAnomaly,
          riskLevel: anomalyResult.riskLevel,
          reasons: anomalyResult.reasons,
          recommendedAction: anomalyResult.recommendedAction,
        };
      }

      await db.insert(auditLogs).values({
        eventType: "user_login",
        userId,
        organizationId: organizationId ?? null,
        resourceType: "session",
        resourceId: null,
        action: success ? "login_success" : "login_failed",
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        metadata,
        createdAt: new Date(),
      });

      logger.auth.loginAttempt({
        userId,
        success,
        ipAddress: ipAddress ?? "unknown",
        userAgent: userAgent ?? "unknown",
        anomalyDetected: anomalyResult?.isAnomaly ?? false,
      });
    } catch (error) {
      logger.error("Failed to log login attempt", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  static async getLoginHistory(
    userId: string,
    limit = 20
  ): Promise<
    Array<{
      timestamp: Date;
      ipAddress: string | null;
      userAgent: string | null;
      success: boolean;
      anomaly?: {
        detected: boolean;
        riskLevel: string;
        reasons: string[];
      };
    }>
  > {
    const logs = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.userId, userId),
          eq(auditLogs.eventType, "user_login")
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return logs.map((log) => {
      const metadata = (log.metadata ?? {}) as Record<string, unknown>;
      const anomalyData = metadata.anomaly as
        | {
            detected: boolean;
            riskLevel: string;
            reasons: string[];
          }
        | undefined;

      return {
        timestamp: log.createdAt,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        success: Boolean(metadata.success),
        anomaly: anomalyData
          ? {
              detected: anomalyData.detected,
              riskLevel: anomalyData.riskLevel,
              reasons: anomalyData.reasons,
            }
          : undefined,
      };
    });
  }

  static async getActiveSessions(userId: string): Promise<
    Array<{
      id: string;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: Date;
      expiresAt: Date;
      isCurrent?: boolean;
    }>
  > {
    const activeSessions = await db
      .select()
      .from(sessions)
      .where(
        and(eq(sessions.userId, userId), gte(sessions.expiresAt, new Date()))
      )
      .orderBy(desc(sessions.createdAt));

    return activeSessions.map((session) => ({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));
  }

  static async revokeSession(
    sessionId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const result = await db
        .delete(sessions)
        .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
        .returning();

      if (result.length > 0) {
        logger.info("Session revoked", {
          sessionId,
          userId,
          component: "auth-anomaly-detection",
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error("Failed to revoke session", {
        sessionId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  static async revokeAllOtherSessions(
    currentSessionId: string,
    userId: string
  ): Promise<number> {
    try {
      const result = await db
        .delete(sessions)
        .where(
          and(eq(sessions.userId, userId), eq(sessions.id, currentSessionId))
        )
        .returning();

      const count = result.length;

      logger.info("All other sessions revoked", {
        userId,
        currentSessionId,
        count,
        component: "auth-anomaly-detection",
      });

      return count;
    } catch (error) {
      logger.error("Failed to revoke all other sessions", {
        userId,
        currentSessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }
}
