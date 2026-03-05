/**
 * Data Retention Configuration
 * 
 * Configurable retention periods for all data types in the application.
 * These values can be overridden via environment variables.
 * 
 * Compliance: AVG/GDPR, NEN 7510, SSD-2.4.01
 */

export const dataRetentionConfig = {
  sessions: {
    durationDays: Number(process.env.DATA_RETENTION_SESSION_DURATION ?? 7),
  },

  invitations: {
    durationDays: Number(process.env.DATA_RETENTION_INVITATION_DURATION ?? 7),
  },

  softDeletes: {
    recoveryWindowDays: Number(
      process.env.DATA_RETENTION_SOFT_DELETE_RECOVERY_DAYS ?? 30
    ),
    conversationInactiveDays: Number(
      process.env.DATA_RETENTION_CONVERSATION_INACTIVE_DAYS ?? 90
    ),
  },

  cache: {
    embeddingCacheDays: Number(
      process.env.DATA_RETENTION_EMBEDDING_CACHE_DAYS ?? 30
    ),
  },

  exports: {
    dataExportDays: Number(process.env.DATA_RETENTION_DATA_EXPORT_DAYS ?? 7),
  },

  auditLogs: {
    retentionYears: Number(process.env.DATA_RETENTION_AUDIT_LOG_YEARS ?? 7),
  },

  notifications: {
    retentionDays: Number(process.env.DATA_RETENTION_NOTIFICATION_DAYS ?? 90),
  },

  history: {
    taskHistoryDays: Number(
      process.env.DATA_RETENTION_TASK_HISTORY_DAYS ?? 365
    ),
    reprocessingHistoryDays: Number(
      process.env.DATA_RETENTION_REPROCESSING_HISTORY_DAYS ?? 90
    ),
  },

  consent: {
    retentionYears: Number(process.env.DATA_RETENTION_CONSENT_LOG_YEARS ?? 7),
  },
} as const;

/**
 * Get the date for a given number of days in the past
 */
export function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Get the date for a given number of years in the past
 */
export function getYearsAgo(years: number): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
}

/**
 * Validate retention configuration on startup
 */
export function validateDataRetentionConfig(): void {
  const errors: string[] = [];

  if (dataRetentionConfig.sessions.durationDays < 1) {
    errors.push("Session duration must be at least 1 day");
  }

  if (dataRetentionConfig.softDeletes.recoveryWindowDays < 1) {
    errors.push("Soft delete recovery window must be at least 1 day");
  }

  if (dataRetentionConfig.auditLogs.retentionYears < 7) {
    errors.push(
      "Audit log retention must be at least 7 years for compliance (NEN 7510)"
    );
  }

  if (dataRetentionConfig.consent.retentionYears < 7) {
    errors.push(
      "Consent log retention must be at least 7 years for legal compliance (medical context)"
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Data retention configuration validation failed:\n${errors.join("\n")}`
    );
  }
}
