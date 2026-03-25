# Recording Webhook Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate Vercel OOM on large Recall recordings by splitting the monolithic webhook handler into two zero-memory workflows (transcription + storage).

**Architecture:** The `processRecordingDone` webhook handler becomes a thin dispatcher that creates a recording DB entry (metadata only, no file) and kicks off two independent workflows: (1) transcription passes the Recall URL directly to Deepgram, (2) storage uses Azure `beginCopyFromURL` to server-side copy the file. App-level encryption for bot recordings is replaced by Azure SSE + CMK.

**Tech Stack:** Next.js 16, Drizzle ORM, Azure Blob Storage SDK, Deepgram Nova-3, workflow/api (`start`, `"use workflow"`, `"use step"`), neverthrow

**Spec:** `docs/superpowers/specs/2026-03-25-recording-webhook-streaming-design.md`

---

## File Structure

### New Files

| File                                                           | Responsibility                                                    |
| -------------------------------------------------------------- | ----------------------------------------------------------------- |
| `src/workflows/store-recording/index.ts`                       | Storage workflow entry: fetch Recall URL → Azure copy → update DB |
| `src/workflows/store-recording/types.ts`                       | StorageWorkflowResult interface, retry config                     |
| `src/workflows/store-recording/steps/step-fetch-recall-url.ts` | Fetch fresh download URL from Recall API                          |
| `src/workflows/store-recording/steps/step-copy-to-azure.ts`    | Azure `beginCopyFromURL` with polling                             |
| `src/workflows/store-recording/steps/step-update-recording.ts` | Update recording DB entry with blob URL, fileSize, mimeType       |

### Modified Files

| File                                                                             | Change                                                                    |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `src/server/db/schema/recordings.ts`                                             | Make file fields nullable, add `storageStatus`, add `recallBotId`         |
| `src/server/dto/recording.dto.ts`                                                | Update types for nullable file fields + new fields                        |
| `src/server/services/recording.service.ts`                                       | Update `toDto` mapper for new fields, add `updateRecordingStorage` method |
| `src/server/data-access/recordings.queries.ts`                                   | Extend `updateRecording` Pick type for storage fields                     |
| `src/server/services/storage/storage.types.ts`                                   | Add `CopyFromUrlResult` interface, `copyFromURL` method                   |
| `src/server/services/storage/azure.storage.ts`                                   | Implement `copyFromURL` with `beginCopyFromURL`                           |
| `src/server/services/bot-webhook.service.ts`                                     | Refactor `processRecordingDone` into thin dispatcher                      |
| `src/workflows/convert-recording/index.ts`                                       | Accept optional `recallBotId` + `externalRecordingId` params              |
| `src/workflows/convert-recording/steps/step-transcription.ts`                    | Accept optional `sourceUrl` override                                      |
| `src/app/api/recordings/[recordingId]/playback/route.ts`                         | Handle nullable `fileUrl`, add SAS redirect for unencrypted               |
| `src/features/recordings/components/recording-detail/recording-media-player.tsx` | Null-guard `fileMimeType`                                                 |
| `src/features/recordings/components/recording-detail/recording-info-card.tsx`    | Null-guard `fileName`, `fileSize`                                         |
| `src/features/recordings/components/recording-card.tsx`                          | Null-guard file fields                                                    |
| `src/features/recordings/components/recording-card-with-status.tsx`              | Null-guard file fields                                                    |
| `src/features/bot/components/bot-session-details-modal.tsx`                      | Null-guard session recording fields                                       |
| `src/features/recordings/actions/delete-recording.ts`                            | Skip `storage.del()` when `fileUrl` null                                  |
| `src/server/services/gdpr-deletion.service.ts`                                   | Skip `storage.del()` when `fileUrl` null                                  |

---

## Task 1: DB Schema Migration — Nullable File Fields + storageStatus

**Files:**

- Modify: `src/server/db/schema/recordings.ts`

- [ ] **Step 1: Update schema — make file fields nullable and add new fields**

In `src/server/db/schema/recordings.ts`, change the four file fields from `.notNull()` to nullable, add `storageStatus`, and add `recallBotId`:

```typescript
// Change these lines (remove .notNull()):
fileUrl: text("file_url"),            // was .notNull()
fileName: text("file_name"),          // was .notNull()
fileSize: integer("file_size"),       // was .notNull()
fileMimeType: text("file_mime_type"), // was .notNull()

// Add after fileMimeType:
storageStatus: text("storage_status", { enum: recordingStatusEnum })
  .notNull()
  .default("completed"),  // default "completed" so existing recordings are unaffected
recallBotId: text("recall_bot_id"),   // Recall.ai bot ID for fetching fresh download URLs
```

Note: `storageStatus` reuses the existing `recordingStatusEnum` (`pending | processing | completed | failed`).

- [ ] **Step 2: Generate migration**

Run: `pnpm db:generate --name add-storage-status-nullable-file-fields`

Verify the generated SQL has:

- ALTER COLUMN ... DROP NOT NULL for `file_url`, `file_name`, `file_size`, `file_mime_type`
- ADD COLUMN `storage_status` with default `'completed'`
- ADD COLUMN `recall_bot_id`

- [ ] **Step 3: Commit**

```bash
git add src/server/db/schema/recordings.ts drizzle/
git commit -m "feat(db): add storageStatus, recallBotId, make file fields nullable"
```

---

## Task 2: Update DTO, toDto Mapper, and Data Access Layer

**Files:**

- Modify: `src/server/dto/recording.dto.ts`
- Modify: `src/server/services/recording.service.ts`
- Modify: `src/server/data-access/recordings.queries.ts`

- [ ] **Step 1: Update RecordingDto interface**

```typescript
export interface RecordingDto {
  // ... existing fields ...
  fileUrl: string | null; // was string
  fileName: string | null; // was string
  fileSize: number | null; // was number
  fileMimeType: string | null; // was string
  // ... existing fields ...
  storageStatus: RecordingStatus; // add
  recallBotId: string | null; // add
}
```

Import `RecordingStatus` if not already imported (it is — check the existing import).

- [ ] **Step 2: Update toDto mapper in RecordingService**

In `src/server/services/recording.service.ts`, find the `toDto` method and add the new fields:

```typescript
storageStatus: recording.storageStatus,
recallBotId: recording.recallBotId ?? null,
```

- [ ] **Step 3: Extend RecordingsQueries.updateRecording Pick type**

In `src/server/data-access/recordings.queries.ts`, find the `updateRecording` method. Its `data` parameter uses a `Pick` type — extend it to include the storage fields:

```typescript
// Add these to the Pick type:
| "fileUrl"
| "fileName"
| "fileSize"
| "fileMimeType"
| "storageStatus"
```

- [ ] **Step 4: Add updateRecordingStorage convenience method to RecordingService**

In `src/server/services/recording.service.ts`, add:

```typescript
static async updateRecordingStorage(
  recordingId: string,
  data: {
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    fileMimeType?: string | null;
    storageStatus?: RecordingStatus;
  },
): Promise<ActionResult<void>> {
  try {
    await RecordingsQueries.updateRecording(recordingId, data);
    return ok(undefined);
  } catch (error) {
    return err(
      ActionErrors.internal(
        "Failed to update recording storage",
        error as Error,
        "RecordingService.updateRecordingStorage",
      ),
    );
  }
}
```

- [ ] **Step 5: Audit upload/live recording creation paths**

Search for all calls to `RecordingService.createRecording` outside of `bot-webhook.service.ts`. Ensure they explicitly set `storageStatus: "completed"` (since upload/live modes have the file available immediately). Do NOT rely on the schema default — be explicit.

Run: `grep -rn "createRecording" src/ --include="*.ts" | grep -v "bot-webhook"`

For each match, add `storageStatus: "completed"` to the creation payload.

- [ ] **Step 6: Verify type errors surface**

Run: `pnpm tsc --noEmit 2>&1 | head -60`

Expected: Type errors in consumers that assume non-null file fields. This is intentional — we fix them in Tasks 3-4.

- [ ] **Step 7: Commit**

```bash
git add src/server/dto/recording.dto.ts src/server/services/recording.service.ts src/server/data-access/recordings.queries.ts
git commit -m "feat(dto): update DTO, toDto mapper, and data access for nullable file fields and storageStatus"
```

---

## Task 3: Fix Nullable File Field Consumers — UI Components

**Files:**

- Modify: `src/features/recordings/components/recording-detail/recording-media-player.tsx`
- Modify: `src/features/recordings/components/recording-detail/recording-info-card.tsx`
- Modify: `src/features/recordings/components/recording-card.tsx`
- Modify: `src/features/recordings/components/recording-card-with-status.tsx`
- Modify: `src/features/bot/components/bot-session-details-modal.tsx`

- [ ] **Step 1: Fix recording-media-player.tsx**

Guard the entire `RecordingPlayerWrapper` render behind a storage status check. `RecordingPlayerWrapper` props (`fileUrl`, `fileMimeType`, `fileName`) are non-nullable `string`, so we must guarantee non-null before rendering:

```typescript
// Early return if storage not complete
if (recording.storageStatus !== "completed" || !recording.fileUrl || !recording.fileMimeType || !recording.fileName) {
  return (
    <div className="flex items-center justify-center h-48 rounded-lg border bg-muted">
      <p className="text-muted-foreground text-sm">
        {recording.storageStatus === "failed"
          ? "Recording storage failed"
          : "Recording is being uploaded..."}
      </p>
    </div>
  );
}

// Now safe to compute — all fields guaranteed non-null
const isVideo = recording.fileMimeType.startsWith("video/");
const isAudio = recording.fileMimeType.startsWith("audio/");
```

- [ ] **Step 2: Fix recording-info-card.tsx**

Guard `fileName` and `fileSize`:

```typescript
// For file name display:
{
  recording.fileName ?? "Processing...";
}

// For file size:
{
  recording.fileSize != null ? formatFileSize(recording.fileSize) : "—";
}

// For format:
{
  recording.fileMimeType ?? "—";
}
```

- [ ] **Step 3: Fix recording-card.tsx and recording-card-with-status.tsx**

Add null-safe rendering for any `fileSize`, `fileMimeType`, `fileName` usage. Show "Uploading..." or similar placeholder when `storageStatus` is `"pending"` or `"processing"`.

- [ ] **Step 4: Fix bot-session-details-modal.tsx**

Guard session recording fields:

```typescript
// When displaying recording info from session:
{
  session.recording?.fileSize != null
    ? formatFileSize(session.recording.fileSize)
    : "—";
}
```

- [ ] **Step 5: Verify no remaining type errors in UI**

Run: `pnpm tsc --noEmit 2>&1 | grep -E "(recording-media|recording-info|recording-card|bot-session)" | head -20`

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/recordings/components/ src/features/bot/components/
git commit -m "fix(ui): handle nullable file fields in recording components"
```

---

## Task 4: Fix Nullable File Field Consumers — Server-Side

**Files:**

- Modify: `src/features/recordings/actions/delete-recording.ts`
- Modify: `src/server/services/gdpr-deletion.service.ts`
- Modify: `src/app/api/recordings/[recordingId]/playback/route.ts`

- [ ] **Step 1: Fix delete-recording.ts**

Skip blob deletion when `fileUrl` is null:

```typescript
// Before storage.del():
if (recording.fileUrl) {
  await storage.del(recording.fileUrl);
}
```

- [ ] **Step 2: Fix gdpr-deletion.service.ts**

Same pattern — skip `storage.del()` when `fileUrl` is null:

```typescript
if (recording.fileUrl) {
  await storage.del(recording.fileUrl);
}
```

- [ ] **Step 3: Fix playback route**

Add storage status check at the top of the handler (after recording is fetched and org access is verified):

```typescript
// After organization access check:
if (!recording.fileUrl || recording.storageStatus !== "completed") {
  if (recording.storageStatus === "failed") {
    return NextResponse.json(
      { error: "Recording storage failed" },
      { status: 500 },
    );
  }
  // Storage still in progress
  return NextResponse.json(
    {
      error: "Recording file not yet available",
      storageStatus: recording.storageStatus,
    },
    { status: 202, headers: { "Retry-After": "10" } },
  );
}
```

For non-encrypted recordings, redirect to SAS URL instead of buffering:

```typescript
if (!recording.isEncrypted) {
  const sasUrl = await resolveFetchableUrl(recording.fileUrl, 60);
  return NextResponse.redirect(sasUrl, 302);
}
// Encrypted path remains as-is (buffer + decrypt)
```

- [ ] **Step 4: Verify all type errors resolved**

Run: `pnpm tsc --noEmit 2>&1 | head -30`

Expected: No errors (or only pre-existing errors unrelated to this change).

- [ ] **Step 5: Commit**

```bash
git add src/features/recordings/actions/delete-recording.ts src/server/services/gdpr-deletion.service.ts src/app/api/recordings/\[recordingId\]/playback/route.ts
git commit -m "fix(server): handle nullable fileUrl in deletion and playback"
```

---

## Task 5: Add `copyFromURL` to StorageProvider + Azure Implementation

**Files:**

- Modify: `src/server/services/storage/storage.types.ts`
- Modify: `src/server/services/storage/azure.storage.ts`

- [ ] **Step 1: Add CopyFromUrlResult interface and method to StorageProvider**

In `storage.types.ts`, add:

```typescript
export interface CopyFromUrlResult {
  url: string;
  pathname: string;
  contentLength: number | null;
  contentType: string | null;
}
```

Add to the `StorageProvider` interface:

```typescript
/**
 * Copy a blob from an external URL using server-side copy.
 * The data flows directly from source to Azure — it never passes through the calling process.
 */
copyFromURL?(
  sourceUrl: string,
  destinationPath: string,
  options?: { access?: "public" | "private" }
): Promise<CopyFromUrlResult>;
```

- [ ] **Step 2: Implement `copyFromURL` in Azure storage provider**

In `azure.storage.ts`, add the method to `AzureStorageProvider`:

```typescript
async copyFromURL(
  sourceUrl: string,
  destinationPath: string,
  options?: { access?: "public" | "private" }
): Promise<CopyFromUrlResult> {
  const containerName = getContainerName(options?.access ?? "private");
  const accountName = getAccountName();

  const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${encodeBlobPathForUrl(destinationPath)}`;

  // Generate SAS with write permissions for the destination blob
  const sasUrl = generateBlobSasUrl(blobUrl, "cw", 60); // 60 min for large copies
  const blobClient = new BlobClient(sasUrl);

  // Start server-side copy — Azure fetches from sourceUrl directly
  const poller = await blobClient.beginCopyFromURL(sourceUrl);
  const copyResult = await poller.pollUntilDone();

  if (copyResult.copyStatus !== "success") {
    throw new Error(
      `Azure copy failed with status: ${copyResult.copyStatus} — ${copyResult.copyStatusDescription ?? "no description"}`
    );
  }

  // Get blob properties for contentLength and contentType
  const props = await this.getBlobProperties(blobUrl, {
    pathname: destinationPath,
  });

  return {
    url: blobUrl,
    pathname: destinationPath,
    contentLength: props.contentLength ?? null,
    contentType: props.contentType ?? null,
  };
}
```

Import `BlobClient` if not already imported (it is — check existing imports at top of file).

- [ ] **Step 3: Verify compilation**

Run: `pnpm tsc --noEmit 2>&1 | grep -i "azure.storage\|storage.types" | head -10`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/server/services/storage/storage.types.ts src/server/services/storage/azure.storage.ts
git commit -m "feat(storage): add copyFromURL for server-side blob copy"
```

---

## Task 6: Create Storage Workflow

**Files:**

- Create: `src/workflows/store-recording/index.ts`
- Create: `src/workflows/store-recording/types.ts`
- Create: `src/workflows/store-recording/steps/step-fetch-recall-url.ts`
- Create: `src/workflows/store-recording/steps/step-copy-to-azure.ts`
- Create: `src/workflows/store-recording/steps/step-update-recording.ts`

- [ ] **Step 1: Create types.ts**

```typescript
export const MAX_RETRIES = 3;
export const RETRY_DELAYS = [1000, 5000, 15000]; // ms: 1s, 5s, 15s

export interface StorageWorkflowResult {
  recordingId: string;
  blobUrl: string | null;
  status: "completed" | "failed";
  error?: string;
}
```

- [ ] **Step 2: Create step-fetch-recall-url.ts**

```typescript
import { logger } from "@/lib/logger";
import { RecallApiService } from "@/server/services/recall-api.service";
import type { WorkflowResult } from "@/workflows/lib/workflow-result";
import { failure, success } from "@/workflows/lib/workflow-result";

interface RecallUrlResult {
  url: string;
  duration: number | null;
  mimeType: string;
}

export async function fetchRecallDownloadUrl(
  recallBotId: string,
  externalRecordingId: string,
): Promise<WorkflowResult<RecallUrlResult>> {
  "use step";

  try {
    const result = await RecallApiService.getRecordingDownloadUrl(
      recallBotId,
      externalRecordingId,
    );

    if (result.isErr()) {
      logger.error("Failed to get Recall download URL", {
        component: "StoreRecordingWorkflow",
        recallBotId,
        externalRecordingId,
        error: result.error,
      });
      return failure(result.error);
    }

    return success({
      url: result.value.url,
      duration: result.value.duration ?? null,
      mimeType: result.value.format ?? "video/mp4",
    });
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error("Failed to fetch Recall URL"),
    );
  }
}
```

- [ ] **Step 3: Create step-copy-to-azure.ts**

Note: This step does NOT contain retry logic. Retries happen at the workflow level (see Step 5) so that each retry fetches a fresh Recall URL per the spec.

```typescript
import { logger } from "@/lib/logger";
import { getStorageProvider } from "@/server/services/storage";
import type { CopyFromUrlResult } from "@/server/services/storage/storage.types";
import type { WorkflowResult } from "@/workflows/lib/workflow-result";
import { failure, success } from "@/workflows/lib/workflow-result";

export async function copyToAzureStep(
  sourceUrl: string,
  destinationPath: string,
): Promise<WorkflowResult<CopyFromUrlResult>> {
  "use step";

  try {
    logger.info("Storage workflow: Starting Azure copy", {
      component: "StoreRecordingWorkflow",
      destinationPath,
    });

    const storage = await getStorageProvider();

    if (!storage.copyFromURL) {
      return failure(
        new Error("Storage provider does not support copyFromURL"),
      );
    }

    const result = await storage.copyFromURL(sourceUrl, destinationPath, {
      access: "private",
    });

    logger.info("Storage workflow: Azure copy completed", {
      component: "StoreRecordingWorkflow",
      destinationPath,
      contentLength: result.contentLength,
    });

    return success(result);
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error("Azure copy failed"),
    );
  }
}
```

- [ ] **Step 4: Create step-update-recording.ts**

```typescript
import { logger } from "@/lib/logger";
import { RecordingService } from "@/server/services/recording.service";
import type { WorkflowResult } from "@/workflows/lib/workflow-result";
import { failure, success } from "@/workflows/lib/workflow-result";

interface UpdateRecordingParams {
  recordingId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  fileMimeType: string | null;
}

export async function updateRecordingStorageStep(
  params: UpdateRecordingParams,
): Promise<WorkflowResult<void>> {
  "use step";

  try {
    const result = await RecordingService.updateRecordingStorage(
      params.recordingId,
      {
        fileUrl: params.fileUrl,
        fileName: params.fileName,
        fileSize: params.fileSize ?? 0,
        fileMimeType: params.fileMimeType ?? "video/mp4",
        storageStatus: "completed",
      },
    );

    if (result.isErr()) {
      return failure(result.error);
    }

    logger.info("Storage workflow: Recording updated with blob URL", {
      component: "StoreRecordingWorkflow",
      recordingId: params.recordingId,
      fileUrl: params.fileUrl,
    });

    return success(undefined);
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error("Failed to update recording"),
    );
  }
}
```

- [ ] **Step 5: Create workflow index.ts**

The retry loop lives at the workflow level so each attempt fetches a **fresh Recall URL** (per spec requirement — previous URLs may have expired).

```typescript
import { logger } from "@/lib/logger";
import { RecordingService } from "@/server/services/recording.service";
import type { WorkflowResult as SerializableResult } from "@/workflows/lib/workflow-result";
import { failure, success } from "@/workflows/lib/workflow-result";
import { copyToAzureStep } from "./steps/step-copy-to-azure";
import { fetchRecallDownloadUrl } from "./steps/step-fetch-recall-url";
import { updateRecordingStorageStep } from "./steps/step-update-recording";
import { MAX_RETRIES, RETRY_DELAYS, type StorageWorkflowResult } from "./types";

/**
 * Storage Workflow: Copy Recall recording to Azure Blob Storage
 *
 * Zero-memory on Vercel — Azure fetches the file server-side via beginCopyFromURL.
 * Encrypted at rest via Azure SSE + CMK.
 *
 * Retry strategy: each attempt fetches a fresh Recall URL (previous may have expired).
 */
export async function storeRecordingFromRecall(
  recordingId: string,
  recallBotId: string,
  externalRecordingId: string,
): Promise<SerializableResult<StorageWorkflowResult>> {
  "use workflow";

  try {
    logger.info("Storage workflow: Starting", {
      component: "StoreRecordingWorkflow",
      recordingId,
      recallBotId,
    });

    // Update storage status to processing
    await RecordingService.updateRecordingStorage(recordingId, {
      storageStatus: "processing",
    });

    // Build destination path (stable across retries)
    const fileName = `recall-${externalRecordingId}.mp4`; // Extension updated after URL fetch
    const timestamp = Date.now();

    // Retry loop: fetch fresh URL + copy on each attempt
    let lastError: string = "Unknown error";

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay =
          RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        logger.warn("Storage workflow: Retrying with fresh URL", {
          component: "StoreRecordingWorkflow",
          recordingId,
          attempt,
          delayMs: delay,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Step 1: Fetch fresh Recall download URL (fresh on every attempt)
      const urlResult = await fetchRecallDownloadUrl(
        recallBotId,
        externalRecordingId,
      );

      if (!urlResult.success || !urlResult.value) {
        lastError = "Failed to fetch Recall download URL";
        continue;
      }

      const { url, mimeType } = urlResult.value;

      // Resolve file extension from mimeType
      const mimeToExt: Record<string, string> = {
        "video/mp4": "mp4",
        "video/webm": "webm",
        "audio/mp3": "mp3",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/m4a": "m4a",
      };
      const ext = mimeToExt[mimeType] || "mp4";
      const finalFileName = `recall-${externalRecordingId}.${ext}`;
      const destinationPath = `recordings/${timestamp}-${finalFileName}`;

      // Step 2: Copy to Azure
      const copyResult = await copyToAzureStep(url, destinationPath);

      if (!copyResult.success || !copyResult.value) {
        lastError = "Failed to copy recording to Azure";
        continue;
      }

      // Step 3: Update recording DB entry
      const updateResult = await updateRecordingStorageStep({
        recordingId,
        fileUrl: copyResult.value.url,
        fileName: finalFileName,
        fileSize: copyResult.value.contentLength,
        fileMimeType: copyResult.value.contentType,
      });

      if (!updateResult.success) {
        lastError = "Failed to update recording with blob URL";
        continue;
      }

      logger.info("Storage workflow: Completed", {
        component: "StoreRecordingWorkflow",
        recordingId,
        blobUrl: copyResult.value.url,
      });

      return success({
        recordingId,
        blobUrl: copyResult.value.url,
        status: "completed",
      });
    }

    // All retries exhausted
    await RecordingService.updateRecordingStorage(recordingId, {
      storageStatus: "failed",
    });
    return failure(lastError);
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown storage workflow error";

    logger.error("Storage workflow: Fatal error", {
      component: "StoreRecordingWorkflow",
      recordingId,
      error,
    });

    await RecordingService.updateRecordingStorage(recordingId, {
      storageStatus: "failed",
    });

    return failure(errorMsg);
  }
}
```

- [ ] **Step 6: Verify compilation**

Run: `pnpm tsc --noEmit 2>&1 | grep -i "store-recording" | head -10`

Expected: No errors (some may surface if `RecordingService.updateRecording` doesn't accept `storageStatus` yet — fix the update method to include the new field).

- [ ] **Step 7: Commit**

```bash
git add src/workflows/store-recording/
git commit -m "feat(workflow): add store-recording workflow for Azure server-side copy"
```

---

## Task 7: Modify Transcription Workflow to Accept Recall URL

**Files:**

- Modify: `src/workflows/convert-recording/index.ts`
- Modify: `src/workflows/convert-recording/steps/step-transcription.ts`

- [ ] **Step 1: Update step-transcription.ts to accept optional sourceUrl**

The `executeTranscriptionStep` already receives `fileUrl` as a parameter. No signature change needed — the caller just passes a different URL. The step is already agnostic to the URL source.

Verify: `resolveFetchableUrl` in the transcription service handles non-Azure URLs by returning them unchanged. Read `src/server/services/storage/url-utils.ts` to confirm the `isAzureBlobUrl` check.

- [ ] **Step 2: Update convertRecordingIntoAiInsights to accept Recall params**

Modify the function signature and add URL resolution logic:

```typescript
export async function convertRecordingIntoAiInsights(
  recordingId: string,
  isReprocessing = false,
  recallBotId?: string,
  externalRecordingId?: string,
): Promise<SerializableResult<WorkflowResult>> {
  "use workflow";

  // ... existing code until transcription step ...

  // Step 1: Transcribe audio
  let transcriptionText = recording.transcriptionText;

  if (!isReprocessing || !transcriptionText) {
    // Determine source URL: Recall URL for bot recordings, fileUrl for others
    let sourceUrl = recording.fileUrl;

    if (recallBotId && externalRecordingId) {
      const urlResult = await RecallApiService.getRecordingDownloadUrl(
        recallBotId,
        externalRecordingId,
      );
      if (urlResult.isErr()) {
        const errorMsg = `Failed to get Recall URL: ${urlResult.error}`;
        await updateWorkflowStatus(recordingId, "failed", errorMsg);
        return failure(errorMsg);
      }
      sourceUrl = urlResult.value.url;
    }

    if (!sourceUrl) {
      const errorMsg = "No source URL available for transcription";
      await updateWorkflowStatus(recordingId, "failed", errorMsg);
      return failure(errorMsg);
    }

    const transcriptionResult = await executeTranscriptionStep(
      recordingId,
      sourceUrl,  // was recording.fileUrl
    );
    // ... rest unchanged ...
  }
```

Add the `RecallApiService` import at the top of the file:

```typescript
import { RecallApiService } from "@/server/services/recall-api.service";
```

- [ ] **Step 3: Verify compilation**

Run: `pnpm tsc --noEmit 2>&1 | grep -i "convert-recording" | head -10`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/workflows/convert-recording/
git commit -m "feat(workflow): accept Recall URL params in convertRecordingIntoAiInsights"
```

---

## Task 8: Refactor processRecordingDone Into Thin Dispatcher

**Files:**

- Modify: `src/server/services/bot-webhook.service.ts`

- [ ] **Step 1: Refactor processRecordingDone**

Replace the monolithic method (lines 466-668) with a thin dispatcher. Remove the download, encrypt, and upload logic. The new method:

1. Resolves metadata (unchanged)
2. Finds bot session (unchanged)
3. Checks for duplicate recording (unchanged)
4. Creates recording DB entry with null file fields
5. Updates bot session
6. Kicks off both workflows in parallel

```typescript
static async processRecordingDone(
  event: SvixRecordingEvent,
): Promise<ActionResult<void>> {
  try {
    const { recording, bot } = event.data;
    const resolved = await resolveWebhookMetadata(
      event,
      bot.id,
      "BotWebhookService.processRecordingDone",
    );

    if (!resolved) return ok(undefined);

    const { projectId, organizationId, userId } = resolved;

    const session = await BotSessionsQueries.findByRecallBotId(
      bot.id,
      organizationId,
    );

    if (!session) {
      logger.error("Bot session not found for recording", {
        component: "BotWebhookService.processRecordingDone",
        botId: bot.id,
        organizationId,
      });
      return ok(undefined);
    }

    // Deduplication: check for existing recording
    const existingRecording =
      await RecordingsQueries.selectRecordingByExternalId(
        recording.id,
        organizationId,
      );

    if (existingRecording) {
      logger.info("Recording already exists with external ID", {
        component: "BotWebhookService.processRecordingDone",
        recordingId: existingRecording.id,
        externalRecordingId: recording.id,
      });
      await BotSessionsQueries.updateRecordingId(
        bot.id,
        organizationId,
        existingRecording.id,
        "done",
      );
      // Re-trigger workflows if needed
      await this.triggerAiWorkflow(
        existingRecording.id,
        "BotWebhookService.processRecordingDone",
        bot.id,
        recording.id,
      );
      return ok(undefined);
    }

    // Create recording DB entry with metadata only (no file yet)
    const createResult = await RecordingService.createRecording(
      {
        projectId,
        title: session.meetingTitle ?? "Bot Recording",
        description: null,
        fileUrl: null,
        fileName: null,
        fileSize: null,
        fileMimeType: null,
        duration: null, // Storage workflow can update this
        recordingDate: new Date(),
        recordingMode: "bot",
        transcriptionStatus: "pending",
        storageStatus: "pending",
        transcriptionText: null,
        organizationId,
        createdById: userId,
        externalRecordingId: recording.id,
        recallBotId: bot.id,
        isEncrypted: false, // Azure SSE handles encryption
        encryptionMetadata: null,
        meetingId: session.meetingId ?? null,
      },
      true,
    );

    if (createResult.isErr()) {
      return err(createResult.error);
    }

    const finalRecordingId = createResult.value.id;

    await BotSessionsQueries.updateRecordingId(
      bot.id,
      organizationId,
      finalRecordingId,
      "done",
    );

    // Kick off both workflows in parallel
    await Promise.all([
      this.triggerAiWorkflow(
        finalRecordingId,
        "BotWebhookService.processRecordingDone",
        bot.id,
        recording.id,
      ),
      this.triggerStorageWorkflow(
        finalRecordingId,
        bot.id,
        recording.id,
        "BotWebhookService.processRecordingDone",
      ),
    ]);

    // Post-meeting actions are triggered at the end of the transcription workflow
    // (in the finalize step), since they depend on transcription results.
    // Do NOT fire them here — the workflows haven't completed yet.

    logger.info("Recording dispatched to workflows", {
      component: "BotWebhookService.processRecordingDone",
      recordingId: finalRecordingId,
      sessionId: session.id,
      externalRecordingId: recording.id,
    });

    return ok(undefined);
  } catch (error) {
    logger.error("Failed to process recording done event", {
      component: "BotWebhookService.processRecordingDone",
      error: serializeError(error),
      botId: event.data?.bot?.id,
    });
    return err(
      ActionErrors.internal(
        "Failed to process recording",
        error as Error,
        "BotWebhookService.processRecordingDone",
      ),
    );
  }
}
```

- [ ] **Step 2: Update triggerAiWorkflow to pass Recall params**

```typescript
private static async triggerAiWorkflow(
  recordingId: string,
  component: string,
  recallBotId?: string,
  externalRecordingId?: string,
): Promise<void> {
  try {
    const args: [string, boolean, string?, string?] = [recordingId, false];
    if (recallBotId && externalRecordingId) {
      args.push(recallBotId, externalRecordingId);
    }
    const workflowRun = await start(convertRecordingIntoAiInsights, args);
    logger.info("AI processing workflow triggered", {
      component,
      recordingId,
      run: {
        id: workflowRun.runId,
        name: workflowRun.workflowName,
        status: workflowRun.status,
      },
    });
  } catch (error) {
    logger.error("Failed to trigger AI processing workflow", {
      component,
      recordingId,
      error: serializeError(error),
    });
  }
}
```

- [ ] **Step 3: Add triggerStorageWorkflow method**

```typescript
private static async triggerStorageWorkflow(
  recordingId: string,
  recallBotId: string,
  externalRecordingId: string,
  component: string,
): Promise<void> {
  try {
    const workflowRun = await start(storeRecordingFromRecall, [
      recordingId,
      recallBotId,
      externalRecordingId,
    ]);
    logger.info("Storage workflow triggered", {
      component,
      recordingId,
      run: {
        id: workflowRun.runId,
        name: workflowRun.workflowName,
        status: workflowRun.status,
      },
    });
  } catch (error) {
    logger.error("Failed to trigger storage workflow", {
      component,
      recordingId,
      error: serializeError(error),
    });
  }
}
```

Add import at top of file:

```typescript
import { storeRecordingFromRecall } from "../../workflows/store-recording";
```

- [ ] **Step 4: Remove unused imports**

Remove `encrypt`, `generateEncryptionMetadata` imports since bot recordings no longer use app-level encryption. Keep them if used elsewhere in the file (check other methods).

Remove the `downloadRecording` private method (lines 843-872) — it's no longer called. Keep `getFileExtension` if used elsewhere, otherwise remove it too.

- [ ] **Step 5: Verify compilation**

Run: `pnpm tsc --noEmit 2>&1 | grep -i "bot-webhook" | head -20`

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/server/services/bot-webhook.service.ts
git commit -m "refactor(webhook): split processRecordingDone into thin dispatcher + dual workflows"
```

---

## Task 9: Verify Full Build + Lint

- [ ] **Step 1: Run full type check**

Run: `pnpm tsc --noEmit`

Expected: Clean output.

- [ ] **Step 2: Run linter**

Run: `pnpm lint`

Expected: No new errors.

- [ ] **Step 3: Fix any remaining issues**

Address any type errors or lint warnings introduced by the changes.

- [ ] **Step 4: Final commit if fixes needed**

```bash
git add -A
git commit -m "fix: resolve type and lint issues from webhook streaming refactor"
```

---

## Task 10: Manual Verification — Azure beginCopyFromURL + Recall URL

This is a manual verification step per the spec requirement.

- [ ] **Step 1: Test that Azure `beginCopyFromURL` can fetch from a Recall download URL**

Trigger a test recording via Recall and capture the download URL from logs. Then run a quick script:

```typescript
// Quick test: verify Azure can copy from Recall URL
import { BlobClient } from "@azure/storage-blob";

const recallUrl = "https://..."; // From Recall API
const destSasUrl = "https://..."; // Generate via Azure portal or script

const blobClient = new BlobClient(destSasUrl);
const poller = await blobClient.beginCopyFromURL(recallUrl);
const result = await poller.pollUntilDone();
console.log("Copy status:", result.copyStatus);
```

If this fails, implement the streaming fallback as described in the spec:

- Replace `copyFromURL` body with: fetch(sourceUrl) stream → blockBlobClient.uploadStream()
- This still avoids buffering the full file

- [ ] **Step 2: Document result**

If `beginCopyFromURL` works: no further action.
If it fails: implement streaming fallback in `azure.storage.ts` and commit.
