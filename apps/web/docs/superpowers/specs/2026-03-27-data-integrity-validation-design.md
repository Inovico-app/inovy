# Data Integrity Validation Design

**Issue:** INO2-560
**Date:** 2026-03-27
**Status:** Draft

## Context

Inovy has GDPR/AVG infrastructure in place (audit logs, data exports, user deletion, privacy requests, backup verification), but with gaps that prevent production readiness:

1. **Audit log hash chain is incomplete** — `previousHash` is always `null`, so tamper detection doesn't verify sequence integrity
2. **GDPR data export stores ZIP in PostgreSQL** — `fileData` column stores binary directly, doesn't scale
3. **No cron for processing user deletions** — 30-day window exists but nothing executes deletions after it expires
4. **No integration tests** for any of the data integrity features
5. **No email notification** when GDPR export is ready for download
6. **No backfill** for existing audit log entries missing `previousHash`

## Design Decisions

- **TDD for hash chain fix** — write failing tests first, then implement
- **Build-then-test for infrastructure changes** — Blob migration, deletion cron, then integration tests
- **Backfill via standalone script** — not a migration, run manually once
- **Sequential deletion processing** — avoid overwhelming DB during bulk anonymization
- **Backwards-compatible Blob migration** — keep `fileData` for old exports, new exports use `blobPath`

## Section 1: Audit Log Hash Chain Fix (TDD)

### Problem

`computeHash()` generates per-entry SHA256 hashes, but `previousHash` is always `null`. The `verifyHashChain()` method recomputes individual hashes but can't verify sequence integrity.

### Fix

When creating a new audit log entry:

1. Query the most recent entry for that organization (by `createdAt DESC`)
2. Take its `hash` value
3. Set it as `previousHash` on the new entry
4. First entry in an org gets `previousHash = "genesis"`

### Files

- Modify: `src/server/data-access/audit-logs.queries.ts` — add `getLastHashByOrganization(organizationId)` query
- Modify: `src/server/services/audit-log.service.ts` — update entry creation to fetch and chain `previousHash`
- Update: `verifyHashChain()` to validate `previousHash` linkage (currently only recomputes individual hashes)
- Create: `src/server/services/__tests__/audit-log.service.test.ts`

### Tests (written first)

1. Creating first entry for org sets `previousHash = "genesis"`
2. Creating subsequent entries chains `previousHash` to prior entry's `hash`
3. `verifyHashChain()` returns valid for an intact chain
4. `verifyHashChain()` detects tampered entry hash
5. `verifyHashChain()` detects broken chain sequence (`previousHash` doesn't match prior `hash`)

## Section 2: Audit Log Hash Chain Backfill

### Problem

Existing audit log entries have `previousHash = null`. New entries will be chained, but old entries break the chain.

### Fix

Standalone script at `scripts/backfill-audit-hash-chain.ts`:

- Queries all audit log entries per organization, ordered by `createdAt ASC`
- First entry: `previousHash = "genesis"`
- Subsequent entries: `previousHash = previous entry's hash`
- Recomputes `hash` for entries where it's `null`
- Idempotent — skips entries where `previousHash` is already set
- Processes one organization at a time to limit memory usage
- Run via: `npx tsx scripts/backfill-audit-hash-chain.ts`

## Section 3: GDPR Export Migration (DB → Azure Blob)

### Problem

ZIP binary stored in `fileData` column in PostgreSQL. Large exports bloat the database.

### Fix

Store ZIP in Azure Blob Storage, keep a `blobPath` reference in the DB.

### Schema Change

Add `blobPath` text column to `data_exports` table. Keep `fileData` for backwards compatibility (old exports still downloadable). New exports set `fileData = null` and use `blobPath`.

### Blob Path Format

`gdpr-exports/{organizationId}/{exportId}.zip`

### Service Changes

**`gdpr-export.service.ts`:**

- `generateExport()` uploads ZIP to Azure Blob Storage via `@azure/storage-blob` (already installed)
- Sets `blobPath` on the export record instead of `fileData`
- Container: `AZURE_STORAGE_PRIVATE_CONTAINER` env var or `"private"` default

**`src/app/api/gdpr-export/[exportId]/route.ts`:**

- If `blobPath` is set: stream from Azure Blob Storage
- If `fileData` is set (legacy): serve from DB (backwards compat)
- If neither: return 404

### Files

- Modify: `src/server/db/schema/data-exports.ts` — add `blobPath` column
- Modify: `src/server/services/gdpr-export.service.ts` — upload to Blob, send email on completion
- Modify: `src/app/api/gdpr-export/[exportId]/route.ts` — stream from Blob
- Create: `src/server/services/__tests__/gdpr-export.service.test.ts`
- Generate migration for `blobPath` column

### Tests

1. Export creates ZIP and uploads to blob storage (mock `@azure/storage-blob`)
2. Download streams from blob storage
3. Download falls back to `fileData` for legacy exports
4. Expired exports return 404
5. Organization isolation — can't download another org's export

## Section 4: GDPR Export Email Notification

### Problem

No email sent when export is ready for download. User has to manually check.

### Fix

Send email via Resend when `generateExport()` completes successfully.

### Files

- Create: `src/emails/templates/gdpr-export-ready.tsx` — React Email template with download link
- Modify: `src/server/services/gdpr-export.service.ts` — send email after successful export

### Template Content

- Subject: "Your data export is ready"
- Body: download link (`{appUrl}/api/gdpr-export/{exportId}`), expiration date (7 days), file size
- Follow existing email template patterns (React Email + Tailwind)

## Section 5: Process Deletions Cron

### Problem

Users request deletion with 30-day recovery window, but nothing executes the deletion after the window expires.

### Fix

New cron job that processes pending deletion requests past their `scheduledDeletionAt`.

### Files

- Create: `src/app/api/cron/process-deletions/route.ts`
- Modify: `src/server/data-access/user-deletion-requests.queries.ts` — add `getPendingDeletions()` query
- Modify: `vercel.json` — add cron schedule (daily at 2 AM UTC)
- Create: `src/server/services/__tests__/gdpr-deletion.service.test.ts`

### Behavior

1. Auth via `Authorization: Bearer ${CRON_SECRET}` (existing pattern)
2. Query `user_deletion_requests` where `status = 'pending'` AND `scheduledDeletionAt <= now()`
3. For each: call `GdprDeletionService.processDeletionRequest(requestId, userId, organizationId, null, null)`
4. Update request status to `completed` (or `failed` with error message)
5. Process sequentially — not parallel — to avoid overwhelming DB
6. Structured logging + Sentry capture on failure

### Tests

1. Deletion anonymizes user data (consistent hash-based IDs)
2. Deletion removes recordings, tasks, conversations
3. Audit logs are anonymized (userId replaced), not deleted
4. Deletion respects 30-day window (doesn't process requests before `scheduledDeletionAt`)

## Section 6: Backup Verification Tests

No code changes to the cron itself — just integration tests.

### Files

- Create: `src/app/api/cron/__tests__/backup-verification.test.ts`

### Tests

1. Returns 200 with `overallStatus: "pass"` when DB and storage accessible
2. Returns 503 when DB unreachable
3. Skips Azure check when `AZURE_STORAGE_CONNECTION_STRING` not configured
4. Rejects unauthenticated requests (401 without CRON_SECRET)

## Files Changed Summary

| File                                                          | Action | Area                               |
| ------------------------------------------------------------- | ------ | ---------------------------------- |
| `src/server/data-access/audit-logs.queries.ts`                | Modify | Hash chain query                   |
| `src/server/services/audit-log.service.ts`                    | Modify | Hash chain creation + verification |
| `src/server/services/__tests__/audit-log.service.test.ts`     | Create | TDD hash chain tests               |
| `scripts/backfill-audit-hash-chain.ts`                        | Create | One-time hash chain backfill       |
| `src/server/db/schema/data-exports.ts`                        | Modify | Add blobPath column                |
| `src/server/services/gdpr-export.service.ts`                  | Modify | Blob upload + email notification   |
| `src/app/api/gdpr-export/[exportId]/route.ts`                 | Modify | Stream from Blob                   |
| `src/server/services/__tests__/gdpr-export.service.test.ts`   | Create | Export tests                       |
| `src/emails/templates/gdpr-export-ready.tsx`                  | Create | Export ready email                 |
| `src/app/api/cron/process-deletions/route.ts`                 | Create | Deletion cron                      |
| `src/server/data-access/user-deletion-requests.queries.ts`    | Modify | Add getPendingDeletions            |
| `vercel.json`                                                 | Modify | Add cron schedule                  |
| `src/server/services/__tests__/gdpr-deletion.service.test.ts` | Create | Deletion tests                     |
| `src/app/api/cron/__tests__/backup-verification.test.ts`      | Create | Backup tests                       |

## Out of Scope

- UI changes to data export or deletion pages
- Immutable log storage (audit logs can still be anonymized for GDPR — by design)
- Automated scheduled export (user-triggered only)
- Data export format changes (stays as single `user-data.json` in ZIP)
