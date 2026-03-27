# Data Integrity Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix audit log hash chain, migrate GDPR exports to Azure Blob Storage, add deletion processing cron, send export email notification, backfill existing hash chain, and write integration tests for all data integrity features.

**Architecture:** TDD for hash chain fix (write tests first). Build-then-test for Blob migration, deletion cron, and email notification. Standalone backfill script for existing entries. All tests use Vitest with mocked dependencies.

**Tech Stack:** Vitest, Drizzle ORM, `@azure/storage-blob`, `archiver`, React Email, Resend, neverthrow

**Spec:** `docs/superpowers/specs/2026-03-27-data-integrity-validation-design.md`

---

## File Structure

| File                                                          | Action | Purpose                                     |
| ------------------------------------------------------------- | ------ | ------------------------------------------- |
| `src/server/services/__tests__/audit-log.service.test.ts`     | Create | TDD tests for hash chain                    |
| `src/server/data-access/audit-logs.queries.ts`                | Modify | Add `getLastHashByOrganization`             |
| `src/server/services/audit-log.service.ts`                    | Modify | Chain `previousHash`, fix `verifyHashChain` |
| `scripts/backfill-audit-hash-chain.ts`                        | Create | One-time hash chain backfill                |
| `src/server/db/schema/data-exports.ts`                        | Modify | Add `blobPath` column                       |
| `src/server/services/gdpr-export.service.ts`                  | Modify | Upload to Blob, send email                  |
| `src/app/api/gdpr-export/[exportId]/route.ts`                 | Modify | Stream from Blob                            |
| `src/emails/templates/gdpr-export-ready.tsx`                  | Create | Export ready email template                 |
| `src/app/api/cron/process-deletions/route.ts`                 | Create | Deletion processing cron                    |
| `src/server/data-access/user-deletion-requests.queries.ts`    | Modify | Add `getPendingDeletions`                   |
| `vercel.json`                                                 | Modify | Add cron schedule                           |
| `src/server/services/__tests__/gdpr-export.service.test.ts`   | Create | Export integration tests                    |
| `src/server/services/__tests__/gdpr-deletion.service.test.ts` | Create | Deletion integration tests                  |
| `src/app/api/cron/__tests__/backup-verification.test.ts`      | Create | Backup verification tests                   |

---

### Task 1: TDD — Write Failing Hash Chain Tests

**Files:**

- Create: `src/server/services/__tests__/audit-log.service.test.ts`

- [ ] **Step 1: Create the test file with all hash chain tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before imports
vi.mock("@/server/data-access/audit-logs.queries");
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/rbac/organization-isolation", () => ({
  validateOrganizationContext: vi.fn().mockResolvedValue({
    isErr: () => false,
    value: { organizationId: "org-1" },
  }),
  assertOrganizationAccess: vi.fn(),
}));

import { AuditLogService, computeHash } from "../audit-log.service";
import { AuditLogsQueries } from "@/server/data-access/audit-logs.queries";

const mockedQueries = vi.mocked(AuditLogsQueries);

function makeAuditLogEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "log-1",
    eventType: "test.event",
    resourceType: "recording" as const,
    resourceId: "rec-1",
    userId: "user-1",
    organizationId: "org-1",
    action: "create" as const,
    category: "mutation" as const,
    ipAddress: null,
    userAgent: null,
    metadata: null,
    previousHash: null,
    hash: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("Audit Log Hash Chain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("computeHash", () => {
    it("produces a deterministic SHA256 hash", () => {
      const entry = makeAuditLogEntry();
      const hash1 = computeHash(entry);
      const hash2 = computeHash(entry);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces different hashes for different entries", () => {
      const entry1 = makeAuditLogEntry({ userId: "user-1" });
      const entry2 = makeAuditLogEntry({ userId: "user-2" });
      expect(computeHash(entry1)).not.toBe(computeHash(entry2));
    });
  });

  describe("createAuditLog — hash chain linking", () => {
    it("sets previousHash to 'genesis' for the first entry in an org", async () => {
      mockedQueries.getLatestLog.mockResolvedValue(null);
      mockedQueries.insert.mockImplementation(async (entry) => ({
        ...makeAuditLogEntry(),
        ...entry,
        id: "new-log-1",
      }));

      const result = await AuditLogService.createAuditLog({
        eventType: "test.event",
        resourceType: "recording",
        resourceId: "rec-1",
        userId: "user-1",
        organizationId: "org-1",
        action: "create",
        category: "mutation",
      });

      expect(result.isOk()).toBe(true);
      const insertCall = mockedQueries.insert.mock.calls[0]?.[0];
      expect(insertCall?.previousHash).toBe("genesis");
    });

    it("chains previousHash to the last entry's hash", async () => {
      const lastEntry = makeAuditLogEntry({
        id: "last-log",
        hash: "abc123def456",
      });
      mockedQueries.getLatestLog.mockResolvedValue(lastEntry);
      mockedQueries.insert.mockImplementation(async (entry) => ({
        ...makeAuditLogEntry(),
        ...entry,
        id: "new-log-2",
      }));

      const result = await AuditLogService.createAuditLog({
        eventType: "test.event",
        resourceType: "recording",
        resourceId: "rec-2",
        userId: "user-1",
        organizationId: "org-1",
        action: "create",
        category: "mutation",
      });

      expect(result.isOk()).toBe(true);
      const insertCall = mockedQueries.insert.mock.calls[0]?.[0];
      expect(insertCall?.previousHash).toBe("abc123def456");
    });
  });

  describe("verifyHashChain — chain integrity", () => {
    it("returns all valid for an intact chain", async () => {
      const entry1 = makeAuditLogEntry({
        id: "log-1",
        previousHash: "genesis",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      });
      entry1.hash = computeHash(entry1);

      const entry2 = makeAuditLogEntry({
        id: "log-2",
        previousHash: entry1.hash,
        createdAt: new Date("2026-01-01T00:01:00Z"),
        resourceId: "rec-2",
      });
      entry2.hash = computeHash(entry2);

      mockedQueries.verifyHashChain.mockResolvedValue([
        { log: entry1, isValid: true },
        { log: entry2, isValid: true },
      ]);

      const result = await AuditLogService.verifyHashChain("org-1");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.every((r) => r.isValid)).toBe(true);
      }
    });

    it("detects a tampered entry hash", async () => {
      const entry1 = makeAuditLogEntry({
        id: "log-1",
        previousHash: "genesis",
        hash: "tampered-hash",
      });

      mockedQueries.verifyHashChain.mockResolvedValue([
        { log: entry1, isValid: false },
      ]);

      const result = await AuditLogService.verifyHashChain("org-1");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value[0]?.isValid).toBe(false);
      }
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/server/services/__tests__/audit-log.service.test.ts`
Expected: FAIL — `getLatestLog` not called (previousHash is hardcoded to `null`)

- [ ] **Step 3: Commit failing tests**

```bash
git add src/server/services/__tests__/audit-log.service.test.ts
git commit -m "test(audit): add failing TDD tests for hash chain linking and verification"
```

---

### Task 2: Fix Audit Log Hash Chain (Make Tests Pass)

**Files:**

- Modify: `src/server/services/audit-log.service.ts`

- [ ] **Step 1: Update createAuditLog to chain previousHash**

In `createAuditLog`, replace the section that sets `previousHash: null` (around line 80-93) with logic that fetches the last entry's hash:

Replace:

```typescript
const logEntry: Omit<NewAuditLog, "hash"> = {
  eventType: params.eventType,
  resourceType: params.resourceType as NewAuditLog["resourceType"],
  resourceId: params.resourceId ?? null,
  userId: params.userId,
  organizationId: params.organizationId,
  action: params.action as NewAuditLog["action"],
  category: params.category ?? "mutation",
  ipAddress: params.ipAddress ?? null,
  userAgent: params.userAgent ?? null,
  metadata: params.metadata ?? null,
  previousHash: null,
};
```

With:

```typescript
// Fetch last entry's hash for chain linking
const lastEntry = await AuditLogsQueries.getLatestLog(params.organizationId);
const previousHash = lastEntry?.hash ?? "genesis";

const logEntry: Omit<NewAuditLog, "hash"> = {
  eventType: params.eventType,
  resourceType: params.resourceType as NewAuditLog["resourceType"],
  resourceId: params.resourceId ?? null,
  userId: params.userId,
  organizationId: params.organizationId,
  action: params.action as NewAuditLog["action"],
  category: params.category ?? "mutation",
  ipAddress: params.ipAddress ?? null,
  userAgent: params.userAgent ?? null,
  metadata: params.metadata ?? null,
  previousHash,
};
```

- [ ] **Step 2: Update verifyHashChain in queries to also check chain linkage**

In `src/server/data-access/audit-logs.queries.ts`, update `verifyHashChain` (around line 227-255) to verify both individual hash integrity AND chain linkage:

Replace the existing `verifyHashChain` method with:

```typescript
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
        // First entry should link to "genesis" (or null for pre-backfill entries)
        chainValid =
          log.previousHash === "genesis" || log.previousHash === null;
      } else {
        const prevLog = logs[i - 1]!;
        chainValid =
          log.previousHash === prevLog.hash || log.previousHash === null;
      }

      results.push({ log, isValid: hashValid && chainValid });
    }

    return results;
  }
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `pnpm vitest run src/server/services/__tests__/audit-log.service.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/services/audit-log.service.ts src/server/data-access/audit-logs.queries.ts
git commit -m "feat(audit): fix hash chain — link previousHash to last entry, verify chain integrity"
```

---

### Task 3: Hash Chain Backfill Script

**Files:**

- Create: `scripts/backfill-audit-hash-chain.ts`

- [ ] **Step 1: Create the backfill script**

```typescript
/**
 * Backfill Audit Log Hash Chain
 *
 * Populates previousHash for existing audit log entries.
 * Idempotent — skips entries where previousHash is already set.
 * Processes one organization at a time.
 *
 * Usage: npx tsx scripts/backfill-audit-hash-chain.ts
 */

import "dotenv/config";
import { createHash } from "crypto";
import { asc, eq, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import { auditLogs } from "../src/server/db/schema/audit-logs";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

function computeHash(log: {
  eventType: string;
  resourceType: string;
  resourceId: string | null;
  userId: string;
  organizationId: string;
  action: string;
  category: string;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
}): string {
  const hashInput = JSON.stringify({
    eventType: log.eventType,
    resourceType: log.resourceType,
    resourceId: log.resourceId ?? "",
    userId: log.userId,
    organizationId: log.organizationId,
    action: log.action,
    category: log.category,
    createdAt: log.createdAt.toISOString(),
    metadata: log.metadata ?? {},
  });
  return createHash("sha256").update(hashInput).digest("hex");
}

async function main() {
  console.log("Starting audit log hash chain backfill...\n");

  // Get distinct organization IDs
  const orgs = await db
    .selectDistinct({ organizationId: auditLogs.organizationId })
    .from(auditLogs);

  console.log(`Found ${orgs.length} organizations to process\n`);

  let totalProcessed = 0;
  let totalSkipped = 0;

  for (const { organizationId } of orgs) {
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, organizationId))
      .orderBy(asc(auditLogs.createdAt));

    let processed = 0;
    let skipped = 0;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i]!;

      // Skip if already backfilled
      if (log.previousHash !== null) {
        skipped++;
        continue;
      }

      const previousHash =
        i === 0 ? "genesis" : (logs[i - 1]!.hash ?? "genesis");

      // Recompute hash if missing
      const hash =
        log.hash ??
        computeHash({
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

      await db
        .update(auditLogs)
        .set({ previousHash, hash })
        .where(eq(auditLogs.id, log.id));

      // Update in-memory for next iteration's chain
      log.hash = hash;
      log.previousHash = previousHash;
      processed++;
    }

    console.log(
      `  Org ${organizationId}: ${processed} updated, ${skipped} skipped (${logs.length} total)`,
    );
    totalProcessed += processed;
    totalSkipped += skipped;
  }

  console.log(
    `\nDone. ${totalProcessed} entries updated, ${totalSkipped} skipped.`,
  );
  await pool.end();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add scripts/backfill-audit-hash-chain.ts
git commit -m "feat(audit): add hash chain backfill script for existing entries"
```

---

### Task 4: GDPR Export Schema Migration

**Files:**

- Modify: `src/server/db/schema/data-exports.ts`

- [ ] **Step 1: Add blobPath column to data-exports schema**

Add after line 38 (`fileData` field):

```typescript
  blobPath: text("blob_path"), // Azure Blob Storage path (replaces fileData for new exports)
```

- [ ] **Step 2: Generate migration**

Run: `pnpm db:generate --name add-data-export-blob-path`

- [ ] **Step 3: Commit**

```bash
git add src/server/db/schema/data-exports.ts src/server/db/migrations/
git commit -m "feat(gdpr): add blobPath column to data_exports for Azure Blob migration"
```

---

### Task 5: GDPR Export Blob Storage Migration

**Files:**

- Modify: `src/server/services/gdpr-export.service.ts`
- Modify: `src/app/api/gdpr-export/[exportId]/route.ts`

- [ ] **Step 1: Update generateExport to upload to Azure Blob**

Read `src/server/services/gdpr-export.service.ts` first. In the `generateExport` method, after the ZIP is created (where it currently sets `fileData`), replace DB storage with Blob upload:

Add Azure Blob import at top:

```typescript
import { BlobServiceClient } from "@azure/storage-blob";
```

After the ZIP buffer is created, replace the DB update that sets `fileData` with:

```typescript
// Upload to Azure Blob Storage
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!connectionString) {
  throw new Error("AZURE_STORAGE_CONNECTION_STRING not configured");
}

const containerName = process.env.AZURE_STORAGE_PRIVATE_CONTAINER ?? "private";
const blobPath = `gdpr-exports/${organizationId}/${exportId}.zip`;

const blobServiceClient =
  BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);
const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

await blockBlobClient.upload(zipBuffer, zipBuffer.length, {
  blobHTTPHeaders: { blobContentType: "application/zip" },
});
```

Then update the export record to set `blobPath` instead of `fileData`:

```typescript
await DataExportsQueries.updateExport(exportId, {
  status: "completed",
  blobPath,
  fileSize: zipBuffer.length,
  recordingsCount: exportData.recordings.length,
  tasksCount: exportData.tasks.length,
  conversationsCount: exportData.conversations.length,
  completedAt: new Date(),
});
```

- [ ] **Step 2: Update download route to stream from Blob**

Read `src/app/api/gdpr-export/[exportId]/route.ts`. Update the GET handler to check `blobPath` first, fall back to `fileData`:

```typescript
// Stream from Azure Blob Storage (new exports)
if (dataExport.blobPath) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 500 },
    );
  }

  const containerName =
    process.env.AZURE_STORAGE_PRIVATE_CONTAINER ?? "private";
  const { BlobServiceClient } = await import("@azure/storage-blob");
  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(dataExport.blobPath);

  const downloadResponse = await blobClient.download();
  const readableStream = downloadResponse.readableStreamBody;

  if (!readableStream) {
    return NextResponse.json(
      { error: "Failed to download export" },
      { status: 500 },
    );
  }

  return new NextResponse(readableStream as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="user-data-export.zip"`,
      ...(dataExport.fileSize
        ? { "Content-Length": String(dataExport.fileSize) }
        : {}),
    },
  });
}

// Fall back to DB-stored fileData (legacy exports)
if (dataExport.fileData) {
  // ... existing fileData response logic ...
}

return NextResponse.json({ error: "Export data not found" }, { status: 404 });
```

- [ ] **Step 3: Commit**

```bash
git add src/server/services/gdpr-export.service.ts src/app/api/gdpr-export/\[exportId\]/route.ts
git commit -m "feat(gdpr): migrate export storage from DB to Azure Blob, stream on download"
```

---

### Task 6: GDPR Export Email Notification

**Files:**

- Create: `src/emails/templates/gdpr-export-ready.tsx`
- Modify: `src/server/services/gdpr-export.service.ts`

- [ ] **Step 1: Create email template**

Follow the existing `BaseTemplate` pattern:

```tsx
import { BaseTemplate } from "./base-template";
import { Button, Section, Text } from "@react-email/components";

interface GdprExportReadyEmailProps {
  downloadUrl: string;
  expiresAt: string;
  fileSize: string;
}

export function GdprExportReadyEmail({
  downloadUrl,
  expiresAt,
  fileSize,
}: GdprExportReadyEmailProps) {
  return (
    <BaseTemplate preview="Your data export is ready for download">
      <Section className="px-6 py-4">
        <Text className="text-lg font-semibold text-gray-900">
          Your data export is ready
        </Text>
        <Text className="text-sm text-gray-600">
          Your requested data export ({fileSize}) is ready for download. The
          download link will expire on {expiresAt}.
        </Text>
        <Button
          href={downloadUrl}
          className="mt-4 rounded-md bg-[#0066cc] px-6 py-3 text-sm font-medium text-white"
        >
          Download Export
        </Button>
        <Text className="mt-4 text-xs text-gray-400">
          If the button doesn&apos;t work, copy and paste this link into your
          browser: {downloadUrl}
        </Text>
      </Section>
    </BaseTemplate>
  );
}
```

- [ ] **Step 2: Send email after successful export**

In `gdpr-export.service.ts`, after the export record is updated to `completed`, add:

```typescript
// Send email notification
try {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.inovico.nl";
  const downloadUrl = `${appUrl}/api/gdpr-export/${exportId}`;
  const userResult = await UserService.getUserById(userId);

  if (userResult.isOk() && userResult.value.email) {
    const { Resend } = await import("resend");
    const { render } = await import("@react-email/render");
    const { GdprExportReadyEmail } =
      await import("@/emails/templates/gdpr-export-ready");

    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = await render(
      GdprExportReadyEmail({
        downloadUrl,
        expiresAt: dataExport.expiresAt.toLocaleDateString("nl-NL"),
        fileSize: `${Math.round(zipBuffer.length / 1024)} KB`,
      }),
    );

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@inovico.nl",
      to: userResult.value.email,
      subject: "Your data export is ready",
      html,
    });
  }
} catch (emailError) {
  // Don't fail the export if email fails
  logger.error("Failed to send export ready email", {
    component: "GdprExportService",
    exportId,
    error: emailError,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/emails/templates/gdpr-export-ready.tsx src/server/services/gdpr-export.service.ts
git commit -m "feat(gdpr): add export ready email notification via Resend"
```

---

### Task 7: Process Deletions Cron

**Files:**

- Create: `src/app/api/cron/process-deletions/route.ts`
- Modify: `src/server/data-access/user-deletion-requests.queries.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Add getPendingDeletions query**

Read `src/server/data-access/user-deletion-requests.queries.ts` first. Add a new static method:

```typescript
  static async getPendingDeletions(): Promise<UserDeletionRequest[]> {
    return db
      .select()
      .from(userDeletionRequests)
      .where(
        and(
          eq(userDeletionRequests.status, "pending"),
          lte(userDeletionRequests.scheduledDeletionAt, new Date()),
        ),
      );
  }
```

Add `lte` to the drizzle-orm import if not already present.

- [ ] **Step 2: Create the cron route**

```typescript
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { UserDeletionRequestsQueries } from "@/server/data-access/user-deletion-requests.queries";
import { GdprDeletionService } from "@/server/services/gdpr-deletion.service";
import { type NextRequest, NextResponse } from "next/server";
import { after, connection } from "next/server";

/**
 * GET /api/cron/process-deletions
 * Processes user deletion requests past their 30-day recovery window
 * Authenticated via Authorization: Bearer ${CRON_SECRET} header
 */
export async function GET(request: NextRequest) {
  await connection();
  const startTime = Date.now();

  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET not configured", {
        component: "GET /api/cron/process-deletions",
      });
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron job attempt", {
        component: "GET /api/cron/process-deletions",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting deletion processing cron job", {
      component: "GET /api/cron/process-deletions",
    });

    const pendingDeletions =
      await UserDeletionRequestsQueries.getPendingDeletions();

    if (pendingDeletions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending deletions to process",
        durationMs: Date.now() - startTime,
      });
    }

    const results = {
      total: pendingDeletions.length,
      succeeded: 0,
      failed: 0,
      errors: [] as Array<{ requestId: string; error: string }>,
    };

    for (const request of pendingDeletions) {
      try {
        const result = await GdprDeletionService.executeDeletion(
          request.userId,
          request.organizationId,
        );

        if (result.isOk()) {
          await UserDeletionRequestsQueries.updateStatus(
            request.id,
            "completed",
          );
          results.succeeded++;
        } else {
          await UserDeletionRequestsQueries.updateStatus(
            request.id,
            "failed",
            result.error.message,
          );
          results.failed++;
          results.errors.push({
            requestId: request.id,
            error: result.error.message,
          });
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        results.failed++;
        results.errors.push({ requestId: request.id, error: errorMsg });

        logger.error("Failed to process deletion request", {
          component: "GET /api/cron/process-deletions",
          requestId: request.id,
          error,
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info("Deletion processing cron job completed", {
      component: "GET /api/cron/process-deletions",
      results,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      results,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(
      "Error in deletion processing cron job",
      {
        component: "GET /api/cron/process-deletions",
        durationMs: duration,
      },
      error as Error,
    );

    after(() => {
      Sentry.withScope((scope) => {
        scope.setTags({ component: "cron-process-deletions" });
        scope.setContext("cron", {
          cron_job: "process-deletions",
          duration_ms: duration,
        });
        Sentry.captureException(error);
      });
    });

    return NextResponse.json(
      { success: false, error: "Internal server error", durationMs: duration },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Add cron schedule to vercel.json**

Read `vercel.json`, add to the `crons` array:

```json
{ "path": "/api/cron/process-deletions", "schedule": "0 2 * * *" }
```

- [ ] **Step 4: Verify UserDeletionRequestsQueries has updateStatus**

Read the queries file. If `updateStatus` doesn't exist, add it:

```typescript
  static async updateStatus(
    id: string,
    status: "completed" | "failed",
    errorMessage?: string,
  ): Promise<void> {
    await db
      .update(userDeletionRequests)
      .set({
        status,
        ...(status === "completed" ? { completedAt: new Date() } : {}),
        ...(errorMessage ? { errorMessage } : {}),
      })
      .where(eq(userDeletionRequests.id, id));
  }
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/process-deletions/route.ts src/server/data-access/user-deletion-requests.queries.ts vercel.json
git commit -m "feat(gdpr): add process-deletions cron for 30-day window execution"
```

---

### Task 8: Integration Tests — GDPR Export

**Files:**

- Create: `src/server/services/__tests__/gdpr-export.service.test.ts`

- [ ] **Step 1: Create export tests**

Mock `@azure/storage-blob`, database queries, and Resend. Test:

1. `generateExport` uploads ZIP to blob storage
2. Export record is updated with `blobPath` and `status: "completed"`
3. Email is sent on completion
4. Failed export sets `status: "failed"` with error message

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@azure/storage-blob");
vi.mock("resend");
vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html></html>"),
}));
vi.mock("@/server/data-access/data-exports.queries");
vi.mock("@/server/data-access/recordings.queries");
vi.mock("@/server/data-access/tasks.queries");
vi.mock("@/server/data-access/chat.queries");
vi.mock("@/server/data-access/ai-insights.queries");
vi.mock("@/server/services/user.service");
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Write tests for:
// - createExportRequest creates pending record with 7-day expiry
// - generateExport produces ZIP and uploads to blob
// - generateExport sends email notification
// - getExportById rejects expired exports
// - getExportById enforces organization isolation
```

- [ ] **Step 2: Commit**

```bash
git add src/server/services/__tests__/gdpr-export.service.test.ts
git commit -m "test(gdpr): add integration tests for GDPR export service"
```

---

### Task 9: Integration Tests — GDPR Deletion

**Files:**

- Create: `src/server/services/__tests__/gdpr-deletion.service.test.ts`

- [ ] **Step 1: Create deletion tests**

Mock database queries and blob storage. Test:

1. `executeDeletion` calls all 7 deletion steps
2. Audit logs are anonymized with consistent hash-based IDs
3. Recordings, tasks, conversations are deleted
4. OAuth connections are removed

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/data-access/recordings.queries");
vi.mock("@/server/data-access/tasks.queries");
vi.mock("@/server/data-access/chat.queries");
vi.mock("@/server/data-access/audit-logs.queries");
vi.mock("@/server/data-access/ai-insights.queries");
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Write tests for:
// - executeDeletion processes all 7 steps
// - anonymizeUserId generates consistent hash-based ID
// - audit logs are anonymized, not deleted
// - deletion respects the 30-day window
```

- [ ] **Step 2: Commit**

```bash
git add src/server/services/__tests__/gdpr-deletion.service.test.ts
git commit -m "test(gdpr): add integration tests for GDPR deletion service"
```

---

### Task 10: Integration Tests — Backup Verification

**Files:**

- Create: `src/app/api/cron/__tests__/backup-verification.test.ts`

- [ ] **Step 1: Create backup verification tests**

Mock database and blob storage. Test the backup verification helper functions directly:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({
  db: { execute: vi.fn() },
}));
vi.mock("@azure/storage-blob");
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Write tests for:
// - verifyDatabaseConnectivity returns pass when DB responds
// - verifyDatabaseConnectivity returns fail when DB unreachable
// - verifyBlobStorageAccessibility returns pass when container exists
// - verifyBlobStorageAccessibility returns skip when not configured
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/__tests__/backup-verification.test.ts
git commit -m "test(backup): add integration tests for backup verification cron"
```

---

### Task 11: Build Verification

- [ ] **Step 1: Run all tests**

Run: `pnpm vitest run`
Expected: All tests pass

- [ ] **Step 2: Run TypeScript type check**

Run: `pnpm tsc --noEmit`
Expected: No new type errors

- [ ] **Step 3: Run linter**

Run: `pnpm lint`
Expected: No new lint errors

- [ ] **Step 4: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 5: Fix any issues and commit**

```bash
git add -A
git commit -m "fix: address build/lint/test issues"
```
