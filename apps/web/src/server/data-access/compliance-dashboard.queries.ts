import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { consentParticipants } from "../db/schema/consent";
import { redactions } from "../db/schema/redactions";
import { privacyRequests } from "../db/schema/privacy-requests";
import { auditLogs } from "../db/schema/audit-logs";
import { recordings } from "../db/schema/recordings";

export interface ConsentStats {
  total: number;
  granted: number;
  pending: number;
  revoked: number;
  expired: number;
  grantedRate: number;
}

export interface RedactionStats {
  total: number;
  pii: number;
  phi: number;
  custom: number;
  automatic: number;
  manual: number;
}

export interface PrivacyRequestStats {
  total: number;
  active: number;
  resolved: number;
  withdrawn: number;
  byType: {
    restriction: number;
    objection: number;
  };
}

export interface RetentionStats {
  totalRecordings: number;
  activeRecordings: number;
  archivedRecordings: number;
  oldestRecordingDate: Date | null;
}

export interface AuditLogStats {
  totalActions: number;
  mutations: number;
  reads: number;
  topEventTypes: { eventType: string; count: number }[];
}

export interface ComplianceDashboardData {
  consent: ConsentStats;
  redactions: RedactionStats;
  privacyRequests: PrivacyRequestStats;
  retention: RetentionStats;
  auditLog: AuditLogStats;
}

export class ComplianceDashboardQueries {
  static async getConsentStats(organizationId: string): Promise<ConsentStats> {
    const result = await db
      .select({
        status: consentParticipants.consentStatus,
        count: count(),
      })
      .from(consentParticipants)
      .innerJoin(recordings, eq(consentParticipants.recordingId, recordings.id))
      .where(eq(recordings.organizationId, organizationId))
      .groupBy(consentParticipants.consentStatus);

    const stats = { total: 0, granted: 0, pending: 0, revoked: 0, expired: 0 };
    for (const row of result) {
      const c = Number(row.count);
      stats.total += c;
      if (row.status === "granted") stats.granted = c;
      else if (row.status === "pending") stats.pending = c;
      else if (row.status === "revoked") stats.revoked = c;
      else if (row.status === "expired") stats.expired = c;
    }

    return {
      ...stats,
      grantedRate: stats.total > 0 ? (stats.granted / stats.total) * 100 : 0,
    };
  }

  static async getRedactionStats(
    organizationId: string,
  ): Promise<RedactionStats> {
    const byType = await db
      .select({
        redactionType: redactions.redactionType,
        count: count(),
      })
      .from(redactions)
      .innerJoin(recordings, eq(redactions.recordingId, recordings.id))
      .where(eq(recordings.organizationId, organizationId))
      .groupBy(redactions.redactionType);

    const byDetection = await db
      .select({
        detectedBy: redactions.detectedBy,
        count: count(),
      })
      .from(redactions)
      .innerJoin(recordings, eq(redactions.recordingId, recordings.id))
      .where(eq(recordings.organizationId, organizationId))
      .groupBy(redactions.detectedBy);

    const stats: RedactionStats = {
      total: 0,
      pii: 0,
      phi: 0,
      custom: 0,
      automatic: 0,
      manual: 0,
    };

    for (const row of byType) {
      const c = Number(row.count);
      stats.total += c;
      if (row.redactionType === "pii") stats.pii = c;
      else if (row.redactionType === "phi") stats.phi = c;
      else if (row.redactionType === "custom") stats.custom = c;
    }

    for (const row of byDetection) {
      const c = Number(row.count);
      if (row.detectedBy === "automatic") stats.automatic = c;
      else if (row.detectedBy === "manual") stats.manual = c;
    }

    return stats;
  }

  static async getPrivacyRequestStats(
    organizationId: string,
  ): Promise<PrivacyRequestStats> {
    const result = await db
      .select({
        status: privacyRequests.status,
        type: privacyRequests.type,
        count: count(),
      })
      .from(privacyRequests)
      .where(eq(privacyRequests.organizationId, organizationId))
      .groupBy(privacyRequests.status, privacyRequests.type);

    const stats: PrivacyRequestStats = {
      total: 0,
      active: 0,
      resolved: 0,
      withdrawn: 0,
      byType: { restriction: 0, objection: 0 },
    };

    for (const row of result) {
      const c = Number(row.count);
      stats.total += c;
      if (row.status === "active") stats.active += c;
      else if (row.status === "resolved") stats.resolved += c;
      else if (row.status === "withdrawn") stats.withdrawn += c;
      if (row.type === "restriction") stats.byType.restriction += c;
      else if (row.type === "objection") stats.byType.objection += c;
    }

    return stats;
  }

  static async getRetentionStats(
    organizationId: string,
  ): Promise<RetentionStats> {
    const result = await db
      .select({
        total: count(),
        oldest: sql<string>`MIN(${recordings.createdAt})`,
      })
      .from(recordings)
      .where(eq(recordings.organizationId, organizationId));

    const statusResult = await db
      .select({
        status: recordings.status,
        count: count(),
      })
      .from(recordings)
      .where(eq(recordings.organizationId, organizationId))
      .groupBy(recordings.status);

    let active = 0;
    let archived = 0;
    for (const row of statusResult) {
      if (row.status === "active") active = Number(row.count);
      else if (row.status === "archived") archived = Number(row.count);
    }

    return {
      totalRecordings: Number(result[0]?.total ?? 0),
      activeRecordings: active,
      archivedRecordings: archived,
      oldestRecordingDate: result[0]?.oldest
        ? new Date(result[0].oldest)
        : null,
    };
  }

  static async getAuditLogStats(
    organizationId: string,
    sinceDate?: Date,
  ): Promise<AuditLogStats> {
    const since = sinceDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days

    const categoryResult = await db
      .select({
        category: auditLogs.category,
        count: count(),
      })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.organizationId, organizationId),
          gte(auditLogs.createdAt, since),
        ),
      )
      .groupBy(auditLogs.category);

    const topEvents = await db
      .select({
        eventType: auditLogs.eventType,
        count: count(),
      })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.organizationId, organizationId),
          gte(auditLogs.createdAt, since),
        ),
      )
      .groupBy(auditLogs.eventType)
      .orderBy(sql`count(*) DESC`)
      .limit(5);

    let mutations = 0;
    let reads = 0;
    for (const row of categoryResult) {
      if (row.category === "mutation") mutations = Number(row.count);
      else if (row.category === "read") reads = Number(row.count);
    }

    return {
      totalActions: mutations + reads,
      mutations,
      reads,
      topEventTypes: topEvents.map((e) => ({
        eventType: e.eventType,
        count: Number(e.count),
      })),
    };
  }

  static async getFullDashboard(
    organizationId: string,
  ): Promise<ComplianceDashboardData> {
    const [consent, redactionStats, privacyRequestStats, retention, auditLog] =
      await Promise.all([
        this.getConsentStats(organizationId),
        this.getRedactionStats(organizationId),
        this.getPrivacyRequestStats(organizationId),
        this.getRetentionStats(organizationId),
        this.getAuditLogStats(organizationId),
      ]);

    return {
      consent,
      redactions: redactionStats,
      privacyRequests: privacyRequestStats,
      retention,
      auditLog,
    };
  }
}
