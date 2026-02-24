# Data Retention Policy

**Version:** 1.0  
**Last Updated:** 2026-02-24  
**Compliance:** AVG/GDPR, NEN 7510, SSD-2.4.01

## Purpose

This document defines the data retention policies for all protected data stored in the Inovy application. The policy ensures compliance with AVG/GDPR requirements and the SSD-2.4.01 security standard, which mandates that protected data is only stored for as long as necessary and for the shortest possible period.

## Legal Framework

- **AVG/GDPR Article 5(1)(e)**: Storage limitation principle
- **NEN 7510**: Dutch healthcare information security standard
- **SSD-2.4.01**: Minimize data storage to necessary duration

## Data Categories and Retention Periods

### 1. Authentication & Session Data

| Data Type | Retention Period | Justification | Cleanup Method |
|-----------|------------------|---------------|----------------|
| Active Sessions | 7 days | User convenience + security balance | Automatic expiration (Better Auth) |
| Expired Sessions | Immediate | No longer needed | Automatic deletion (Better Auth) |
| OAuth Tokens | Until revoked or expired | Required for integration functionality | Automatic refresh + cleanup |
| Magic Links | 15 minutes | Short-lived authentication | Automatic expiration (Better Auth) |
| Password Reset Tokens | 15 minutes | Short-lived password reset | Automatic expiration (Better Auth) |
| Verification Tokens | 24 hours | Email verification | Automatic expiration (Better Auth) |
| Organization Invitations | 7 days | Reasonable time to accept invitation | Automatic expiration (Better Auth) |

### 2. User & Organization Data

| Data Type | Retention Period | Justification | Cleanup Method |
|-----------|------------------|---------------|----------------|
| User Profile Data | Until account deletion | Required for application functionality | Manual deletion or GDPR request |
| Organization Data | Until organization deletion | Required for application functionality | Manual deletion |
| Team Membership | Until user/team removal | Required for application functionality | Manual deletion |
| User Deletion Requests | 30 days after processing | Recovery window for accidental deletions | Automated daily cleanup |

### 3. Core Business Data

| Data Type | Retention Period | Justification | Cleanup Method |
|-----------|------------------|---------------|----------------|
| **Recordings** | | | |
| - Active Recordings | Until archived or deleted | Active business use | Manual archival |
| - Archived Recordings | Until manually deleted | Historical reference | Manual deletion |
| - Deleted Recordings (Soft) | 30 days | Recovery window | Automated daily cleanup |
| **Transcriptions** | Linked to recording lifecycle | Required for recording functionality | Cascade with recording deletion |
| **Consent Records** | 7 years minimum | Legal requirement (medical context) | Manual deletion after legal period |
| **Projects** | | | |
| - Active Projects | Until archived or completed | Active business use | Manual archival |
| - Archived Projects | Until manually deleted | Historical reference | Manual deletion |
| **Tasks** | | | |
| - Active Tasks | Until completion or deletion | Active business use | Manual completion/deletion |
| - Completed Tasks | Until manually deleted | Historical reference | Manual deletion |

### 4. AI & Chat Data

| Data Type | Retention Period | Justification | Cleanup Method |
|-----------|------------------|---------------|----------------|
| Chat Conversations | | | |
| - Active Conversations | Until archived or deleted | Active use | Manual archival or user deletion |
| - Inactive Conversations | 90 days | Automated archival for inactive chats | Automated daily archival |
| - Soft Deleted Conversations | 30 days | Recovery window | Automated daily permanent deletion |
| Chat Messages | Linked to conversation lifecycle | Required for conversation functionality | Cascade with conversation deletion |
| Embedding Cache | 30 days | Performance optimization | Automated daily cleanup |
| AI Insights | Linked to recording lifecycle | Required for recording functionality | Cascade with recording deletion |
| Knowledge Base Entries | Until manually deactivated | Active business use | Manual deactivation |

### 5. Audit & Compliance Data

| Data Type | Retention Period | Justification | Cleanup Method |
|-----------|------------------|---------------|----------------|
| Audit Logs | 7 years | Legal/compliance requirement (SOC 2, NEN 7510) | Automated annual archival + cleanup |
| Consent Audit Logs | 7 years | Legal requirement (medical context) | Automated annual archival + cleanup |
| Chat Audit Logs | 7 years | Legal/compliance requirement | Automated annual archival + cleanup |

### 6. Export & Integration Data

| Data Type | Retention Period | Justification | Cleanup Method |
|-----------|------------------|---------------|----------------|
| Data Export Files (GDPR) | 7 days | Time-limited download availability | Automated daily cleanup |
| OAuth Connections | Until revoked | Required for integration functionality | Manual revocation |
| Drive Watch Subscriptions | 7 days (renewed daily) | Google Drive API limitation | Automated renewal cron job |
| Bot Sessions | Until manually ended | Active business use | Manual termination |

### 7. Notifications & Temporary Data

| Data Type | Retention Period | Justification | Cleanup Method |
|-----------|------------------|---------------|----------------|
| Notifications | 90 days | User convenience | Automated quarterly cleanup |
| Task History | 1 year | Audit trail for task changes | Automated annual cleanup |
| Reprocessing History | 90 days | Technical audit trail | Automated quarterly cleanup |
| Transcription History | Linked to recording lifecycle | Required for recording versioning | Cascade with recording deletion |
| Summary History | Linked to recording lifecycle | Required for summary versioning | Cascade with recording deletion |

## Automated Cleanup Schedule

The following automated cleanup jobs run daily at 02:00 UTC:

1. **Chat Conversation Cleanup** (Daily)
   - Auto-archive conversations inactive for 90+ days
   - Permanently delete soft-deleted conversations older than 30 days

2. **Embedding Cache Cleanup** (Daily)
   - Delete cached embeddings older than 30 days

3. **Data Export Cleanup** (Daily)
   - Delete expired data export files (7+ days old)

4. **User Deletion Request Cleanup** (Daily)
   - Permanently delete user accounts for completed deletion requests past recovery window (30+ days)

5. **Audit Log Archival** (Annually - January 1st, 02:00 UTC)
   - Archive audit logs older than 7 years
   - Export to long-term archival storage

6. **Notification Cleanup** (Quarterly)
   - Delete notifications older than 90 days

7. **Session Cleanup** (Automatic)
   - Handled automatically by Better Auth
   - Expired sessions removed on next access attempt

## Configuration

Retention periods are configurable via environment variables:

```env
# Session & Authentication (days)
DATA_RETENTION_SESSION_DURATION=7
DATA_RETENTION_INVITATION_DURATION=7

# Soft Delete Recovery Windows (days)
DATA_RETENTION_SOFT_DELETE_RECOVERY_DAYS=30
DATA_RETENTION_CONVERSATION_INACTIVE_DAYS=90

# Cache & Temporary Data (days)
DATA_RETENTION_EMBEDDING_CACHE_DAYS=30
DATA_RETENTION_DATA_EXPORT_DAYS=7

# Audit & Compliance (years)
DATA_RETENTION_AUDIT_LOG_YEARS=7
DATA_RETENTION_CONSENT_LOG_YEARS=7

# Notifications & History (days)
DATA_RETENTION_NOTIFICATION_DAYS=90
DATA_RETENTION_TASK_HISTORY_DAYS=365
DATA_RETENTION_REPROCESSING_HISTORY_DAYS=90
```

## GDPR Compliance

### Right to Erasure

When a user exercises their right to erasure (GDPR Article 17):

1. **Immediate Actions**:
   - User account is soft-deleted
   - Personal data is anonymized in shared content
   - OAuth connections are revoked
   - Active sessions are terminated

2. **30-Day Recovery Window**:
   - User can cancel deletion request within 30 days
   - All data remains available (anonymized) during this period
   - After 30 days, permanent deletion is triggered

3. **Permanent Deletion**:
   - User account and personal data permanently deleted
   - Audit logs remain but with anonymized user identifiers
   - Shared content (e.g., recordings with multiple participants) remains with anonymized user references

### Data Minimization

The system implements data minimization principles:

- Only collect data necessary for application functionality
- Use soft deletes with recovery windows instead of immediate permanent deletion
- Automatically purge temporary data (caches, exports)
- Anonymize data where deletion would impact other users' data

## Compliance Monitoring

### Audit Trail

All cleanup operations are logged in the audit log system:

- What data was cleaned up
- When the cleanup occurred
- Why the data was eligible for cleanup (age, status)
- How many records were affected

### Regular Reviews

This policy should be reviewed:

- **Annually**: Full policy review and update
- **Quarterly**: Cleanup job effectiveness review
- **On regulatory changes**: Update retention periods as needed
- **On security incidents**: Review and adjust if necessary

## Implementation Status

### ✅ Implemented

- Session expiration (7 days)
- Soft delete patterns for key data types
- GDPR deletion request workflow with 30-day recovery
- Embedding cache TTL (30 days)
- Data export expiration (7 days)
- Invitation expiration (7 days)

### ✅ Newly Implemented (2026-02-24)

- Automated chat conversation archival and cleanup
- Automated embedding cache cleanup
- Automated data export cleanup
- Automated user deletion request permanent deletion
- Audit log retention and archival
- Notification cleanup
- Master data cleanup orchestration job

## Contact & Governance

**Data Protection Officer**: [To be assigned]  
**Policy Owner**: Engineering Team  
**Last Review Date**: 2026-02-24  
**Next Review Date**: 2027-02-24

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-24 | Initial policy creation with automated cleanup | System |

## References

- [AVG/GDPR Article 5](https://gdpr-info.eu/art-5-gdpr/)
- [NEN 7510](https://www.nen.nl/en/nen-7510-2017-a1-2020-nl-268804)
- [SSD-2.4.01 Standard](../docs/security/SSD-2.md)
