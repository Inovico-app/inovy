# Data Minimization Implementation (SSD-4.4.01)

**Norm:** SSD-4  
**Category:** Noodzakelijk  
**Number:** 4.01  
**Original (NL):** Communicatie van te beschermen gegevens wordt tot een minimum beperkt om de impact van misbruik te verkleinen.

## Overview

This document describes the implementation of data minimization principles across the application to minimize protected data communication and reduce exposure risk.

## Acceptance Criteria

- [x] Data minimization principles applied
- [x] Only necessary data transmitted
- [x] Sensitive data exposure audited

## Implementation

### 1. Role-Based Access Control for Sensitive Data

#### User Roles
The application implements the following role hierarchy:
- **owner**: Organization owner (full access)
- **admin**: Organization administrator (full access)
- **superadmin**: System administrator (full access)
- **manager**: Team/project manager (full metadata access)
- **user**: Standard user (limited access)
- **viewer**: Read-only user (minimal access)

#### Access Rules

**Full Transcription Access** (`canAccessFullTranscription`):
- **Granted to**: owner, admin, superadmin
- **Denied to**: manager, user, viewer
- Non-admin users receive only `redactedTranscriptionText`

**User Email Access** (`canAccessUserEmails`):
- **Granted to**: Organization admins, or when viewing own profile
- **Denied to**: Non-admins viewing other users
- Non-admin users see redacted emails (e.g., `j***@example.com`)

**Sensitive Fields Access** (`canAccessSensitiveFields`):
- **Granted to**: owner, admin, superadmin
- **Denied to**: manager, user, viewer
- Includes: `workflowError`, `encryptionMetadata`

### 2. DTO-Level Data Filtering

#### RecordingDto
**Sensitive Fields** (conditionally included):
- `transcriptionText`: Only for admins (non-admins get `redactedTranscriptionText`)
- `workflowError`: Only for admins
- `encryptionMetadata`: Only for admins

**Implementation**:
```typescript
// RecordingService.toDto() applies role-based filtering
private static toDto(recording: Recording, user?: BetterAuthUser): RecordingDto
```

**Behavior**:
- If `user` is provided: Apply role-based filtering
- If `user` is NOT provided: Return full data (internal operations)

#### UserDto
**Sensitive Fields** (conditionally included):
- `email`: Full email only for admins or own profile; redacted for others

**Implementation**:
```typescript
// UserService.getUserById() applies email filtering
static async getUserById(userId: string, requestingUser?: BetterAuthUser)
```

### 3. Audit Logging for Sensitive Data Access

All sensitive data access operations are logged to the audit log with tamper-proof hash chains.

#### Recorded Events

**Recording Access**:
- `action: "playback"`: When recording file is accessed/played
  - Logged in: `/api/recordings/[recordingId]/playback/route.ts`
  - Metadata: `fileName`, `fileSize`, `isEncrypted`

- `action: "view_full_transcription"`: When admin accesses full transcription
  - Logged in: `RecordingService.getRecordingById()`
  - Metadata: `transcriptionLength`, `hasRedaction`

**Data Exports**:
- `action: "create"`: When GDPR export is requested
  - Logged in: `GdprExportService.createExportRequest()`
  - Metadata: `filters`, `expiresAt`

- `action: "download"`: When GDPR export is downloaded
  - Logged in: `/api/gdpr-export/[exportId]/route.ts`
  - Metadata: `fileSize`, `recordingsCount`, `tasksCount`, `conversationsCount`

**Chat Exports**:
- `action: "export"`: When chat conversation is exported
  - Logged in: `/api/chat/export/[conversationId]/route.ts`
  - Metadata: `format` (text/pdf)

#### Audit Log Fields
Each audit log entry includes:
- `eventType`: Type of event (e.g., `data_access`, `data_export`)
- `resourceType`: Type of resource accessed
- `resourceId`: ID of the resource
- `userId`: User who performed the action
- `organizationId`: Organization context
- `action`: Specific action performed
- `ipAddress`: Client IP address
- `userAgent`: Client user agent
- `metadata`: Additional context
- `hash`: Tamper-proof hash (SHA-256)
- `previousHash`: Hash of previous log entry (hash chain)

### 4. Caching Strategy

Cache keys vary by user role to prevent data leakage between different permission levels:

```typescript
// Example: Recording cache varies by role
cacheTag(`recording:${recordingId}:role:${user?.role ?? "anonymous"}`);
```

This ensures:
- Admin users' cached responses include full transcriptions
- Non-admin users' cached responses include only redacted transcriptions
- No cross-contamination between permission levels

### 5. Internal vs External Operations

**Internal Operations** (full data):
- Background jobs and workflows
- Internal service-to-service calls
- AI processing (transcription, summarization, task extraction)
- When `user` parameter is NOT provided to service methods

**External Operations** (filtered data):
- API responses to clients
- Server actions returning data to UI
- When `user` parameter IS provided to service methods

### 6. Updated Service Methods

All service methods that return DTOs now accept an optional `user` parameter for data minimization:

**RecordingService**:
- `getRecordingById(id, user?, auditContext?)`
- `getRecordingsByProjectId(projectId, organizationId, options?, user?)`
- `getRecordingsByOrganization(organizationId, options?, user?)`
- `createRecording(data, invalidateCache?, user?)`
- `updateRecordingMetadata(id, organizationId, data, user?)`
- `getRecordingWithFullTranscription(id, user, auditContext)` - Admin-only method

**UserService**:
- `getUserById(userId, requestingUser?)`
- `getUsersByIds(userIds, requestingUser?)`

**GdprExportService**:
- `createExportRequest(userId, organizationId, filters?, auditContext?)`

### 7. Updated API Routes

The following API routes have been updated with audit logging:

**Recording Playback**:
- `/api/recordings/[recordingId]/playback`
- Logs: Recording file access with metadata

**GDPR Export**:
- `/api/gdpr-export/[exportId]`
- Logs: Export download with file statistics

**Chat Export**:
- `/api/chat/export/[conversationId]`
- Logs: Chat export with format information

### 8. Updated Server Actions

Server actions now pass user context for data minimization:

**Recording Actions**:
- `getRecordingStatusAction`: Passes user context
- `updateRecordingMetadataAction`: Passes user context

### 9. Security Logging

The application uses structured logging with PII redaction:

**Redacted Fields in Logs**:
- `password`, `apiKey`, `token`, `accessToken`, `refreshToken`
- `secret`, `authorization`, `cookie`, `sessionId`
- `email`, `userEmail`, `emailAddress` (uses `emailHash` instead)

**Email Anonymization**:
```typescript
anonymizeEmail(email) // Returns HMAC-SHA256 hash
```

## Testing Checklist

- [x] TypeScript compilation passes with no errors
- [x] Code follows ESLint standards (no new errors introduced)
- [ ] Verify non-admin users cannot see full transcriptions (manual testing required)
- [ ] Verify non-admin users see redacted emails for other users (manual testing required)
- [ ] Verify non-admin users can see their own email (manual testing required)
- [ ] Verify admin users can see all data (manual testing required)
- [ ] Verify audit logs created for recording playback (manual testing required)
- [ ] Verify audit logs created for data exports (manual testing required)
- [ ] Verify audit logs created for full transcription access (manual testing required)
- [ ] Verify cache isolation between roles (manual testing required)
- [ ] Verify internal operations still have full data access (code review confirmed)

### Automated Testing

All changes pass TypeScript type checking:
```bash
pnpm run typecheck
```

### Manual Testing Required

To complete compliance verification, perform the following manual tests:

1. **Test as Viewer Role**:
   - Login as a viewer user
   - View recordings list - verify `transcriptionText` is undefined
   - View recording detail - verify only `redactedTranscriptionText` is shown
   - View user profiles - verify email addresses are redacted

2. **Test as Admin Role**:
   - Login as an admin user
   - View recordings list - verify `transcriptionText` is present
   - View recording detail - verify full transcription is shown
   - View user profiles - verify full email addresses are shown
   - Check audit logs for `view_full_transcription` events

3. **Test Recording Playback**:
   - Play a recording file
   - Check audit logs for `playback` event with proper metadata

4. **Test Data Exports**:
   - Request GDPR export
   - Check audit logs for `create` event
   - Download export
   - Check audit logs for `download` event with file statistics

5. **Test Chat Export**:
   - Export a chat conversation
   - Check audit logs for `export` event

## Compliance Notes

### GDPR Compliance
- ✅ Data minimization principle (Article 5.1.c)
- ✅ Purpose limitation
- ✅ Storage limitation (exports expire after 7 days)
- ✅ Audit trail for data access

### NEN 7510 Compliance
- ✅ Access control based on roles
- ✅ Audit logging (NEN 7512)
- ✅ Encryption of sensitive data in transit and at rest
- ✅ Organization isolation

### SSD-4 (Veilige Communicatie)
- ✅ 4.01: Communication of protected data minimized
- ✅ Only necessary data transmitted based on user role
- ✅ Sensitive data exposure audited comprehensively

## Future Enhancements

1. **Field-Level Permissions**: More granular control over individual fields
2. **Dynamic Redaction Rules**: Configurable redaction patterns per organization
3. **Data Retention Policies**: Automatic cleanup of audit logs after retention period
4. **Real-time Access Monitoring**: Dashboards for security teams to monitor data access
5. **Anomaly Detection**: Alert on unusual data access patterns

## References

- [Data Minimization Utility](/workspace/apps/web/src/lib/data-minimization.ts)
- [Recording Service](/workspace/apps/web/src/server/services/recording.service.ts)
- [User Service](/workspace/apps/web/src/server/services/user.service.ts)
- [Audit Log Service](/workspace/apps/web/src/server/services/audit-log.service.ts)
- [RBAC Module](/workspace/apps/web/src/lib/rbac/rbac.ts)
