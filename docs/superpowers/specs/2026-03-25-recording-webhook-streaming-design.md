# Recording Webhook Streaming Design

**Date:** 2026-03-25
**Status:** Draft
**Problem:** Vercel function OOMs on `recording.done` webhook for large recordings (2-hour mp4, ~1 GB) because it downloads the entire file to memory, encrypts it, and uploads to blob storage — all within a 2 GB memory limit.

## Solution Overview

Split the monolithic `processRecordingDone` handler into a thin webhook dispatcher that kicks off two independent, zero-memory workflows:

1. **Transcription Workflow** — passes the Recall download URL directly to Deepgram (no file download)
2. **Storage Workflow** — uses Azure Blob's server-side `beginCopyFromURL` to copy the file directly from Recall (no Vercel memory)

App-level encryption is removed in favor of Azure SSE with customer-managed keys (CMK) via Key Vault, which satisfies both GDPR Article 32 and ISO 27002 Control 8.24.

## Architecture

### New Webhook Flow

```
webhook (recording.done)
  → create recording DB entry (metadata only, no file)
  → update bot session
  → kick off in parallel:
      ├── Transcription Workflow
      └── Storage Workflow
```

The webhook handler becomes a thin dispatcher with near-zero memory usage.

### Transcription Workflow

Reuses the existing `convertRecordingIntoAiInsights` workflow with a modified source URL:

```
1. Get Recall download URL (reuse getRecordingDownloadUrl())
2. Pass URL directly to Deepgram transcribeUrl() (reuse TranscriptionService)
3. Run AI insights in parallel (reuse existing steps):
   - Summary generation (OpenAI)
   - Task extraction (OpenAI)
4. Finalize (reuse existing step): cache invalidation, notifications
```

**Key change:** `TranscriptionService.transcribeUploadedFile()` must accept a direct URL in addition to blob storage URLs, bypassing SAS resolution when a non-blob URL is provided.

### Storage Workflow

New workflow that copies the recording to Azure Blob without the file ever passing through Vercel:

```
1. Get Recall download URL (reuse getRecordingDownloadUrl())
2. Call Azure Blob beginCopyFromURL(recallUrl)
   - Azure fetches the file server-side
   - Encrypted at rest via Azure SSE + CMK
3. Update recording DB entry with blob URL, fileSize, mimeType
```

Zero memory on Vercel. The copy is async on Azure's side.

**Recall URL expiry:** Recall download URLs are temporary/signed. Each workflow fetches a fresh URL via `getRecordingDownloadUrl()` at the start of its execution rather than receiving it from the webhook handler. This ensures the URL is as fresh as possible and avoids issues with expiry during long Azure copy operations.

**`beginCopyFromURL` compatibility:** Azure's `beginCopyFromURL` issues a plain GET to the source URL. Recall download URLs are pre-signed (similar to S3 pre-signed URLs) with auth in the query string, so this should work. **Before implementation, verify with a manual test** that Azure can fetch from a Recall URL. Fallback: if `beginCopyFromURL` fails due to header requirements, use a lightweight streaming proxy (fetch stream → upload stream) inside a workflow step, which still avoids buffering the full file.

## Failure Handling

The two workflows are independent. Partial failures are handled via status fields on the recording:

| Scenario                              | Result                                                        | User Experience                                                    |
| ------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| Transcription succeeds, storage fails | `transcriptionStatus: "completed"`, `storageStatus: "failed"` | Can see transcript/summary, cannot play recording                  |
| Storage succeeds, transcription fails | `storageStatus: "completed"`, `transcriptionStatus: "failed"` | Can play recording, no transcript (existing retry logic applies)   |
| Both fail                             | Both statuses `"failed"`                                      | Recording entry exists with metadata, both retryable independently |

Each workflow can be retried independently without affecting the other.

### Storage Workflow Retry Strategy

Mirrors the existing transcription retry logic (exponential backoff):

- Max retries: 3
- Backoff delays: 1s, 5s, 15s
- On each retry: fetch a fresh Recall download URL (previous one may have expired)
- On exhaustion: set `storageStatus: "failed"`, send failure notification

### Status Lifecycle

```
storageStatus:       pending → processing → completed
                                         ↘ failed (retryable)

transcriptionStatus: pending → processing → completed
                                         ↘ failed (retryable)
```

Both statuses are set to `pending` when the recording DB entry is created. Each workflow manages its own status independently.

### Post-Meeting Actions

`PostActionExecutorService.executePostActions` fires at the end of the transcription workflow (in the finalize step), since post-actions depend on transcription results (summaries, tasks). This matches the current behavior.

## Changes

### Modify

1. **`bot-webhook.service.ts`** — `processRecordingDone` becomes a thin dispatcher:
   - Create recording DB entry with Recall metadata and placeholder file fields (see schema changes below)
   - Update bot session
   - Kick off transcription and storage workflows in parallel, passing `recordingId` and `recallBotId` (each workflow fetches its own fresh Recall URL)
   - Remove all download/encrypt/upload logic

2. **`TranscriptionService`** — No changes needed. `resolveFetchableUrl()` in `url-utils.ts` already returns non-Azure URLs unchanged (`if (!isAzureBlobUrl(url)) return url`). The Recall URL will pass through to Deepgram as-is.

3. **`convertRecordingIntoAiInsights` workflow** — Modify to accept an optional `sourceUrl` parameter alongside `recordingId`. When provided, use `sourceUrl` for transcription instead of reading `recording.fileUrl` from DB. The workflow fetches a fresh Recall URL via `getRecordingDownloadUrl()` at execution time and passes it as `sourceUrl`.

4. **`StorageProvider` interface** — Add `copyFromURL(sourceUrl: string, destinationPath: string): Promise<CopyResult>` method.

5. **Azure storage implementation** — Implement `copyFromURL` using Azure Blob SDK's `beginCopyFromURL`. Polling for copy completion happens inside a workflow step with retry semantics. Use `syncCopyFromURL` for files under 256 MB (faster, synchronous).

6. **Recording DB schema** — Two changes:
   - Add `storageStatus` field with values: `pending` | `processing` | `completed` | `failed`
   - Make `fileUrl`, `fileName`, `fileSize`, `fileMimeType` **nullable**. The webhook handler creates the recording entry before the file is available. The storage workflow populates these fields upon completion. Requires a DB migration.
   - **Migration impact:** All code reading these fields must handle `null` (e.g., playback endpoint returns 202 when `storageStatus` is not `completed`).

7. **Playback endpoint** (`/api/recordings/[recordingId]/playback`) — Check `storageStatus` before attempting to resolve file URL. Return 202 with retry-after header when storage is pending/processing, and appropriate error when failed.

### Create

1. **Storage workflow** (`src/workflows/store-recording/`) — New workflow using `"use workflow"` / `"use step"` directives (matching existing workflow patterns):
   - Step 1: Fetch fresh Recall download URL via `getRecordingDownloadUrl(recallBotId)`
   - Step 2: Call `storageProvider.copyFromURL()` (with polling inside the step)
   - Step 3: Update recording DB entry with blob URL, fileSize, mimeType
   - Updates `storageStatus` throughout (`pending` → `processing` → `completed`/`failed`)
   - Retry strategy: 3 retries with exponential backoff (1s, 5s, 15s), fresh URL on each retry

### Remove

1. **App-level encryption for bot recordings** — The `downloadRecording()` helper, buffer encryption step, and encryption metadata in `processRecordingDone` are removed for bot recordings. The encryption logic and `ENABLE_ENCRYPTION_AT_REST` env var are **retained** for `upload` and `live` recording modes, which still go through the existing buffer-based flow. Bot recordings are the only mode affected by this change.

### No Changes

- AI insight steps (summary, tasks, finalize, notifications) — reused as-is
- Deepgram client configuration
- Webhook route handler / signature verification
- Recall API service (`getRecordingDownloadUrl`)
- Vercel storage implementation (not affected, Azure-only change)

## Infrastructure

- **Azure Key Vault:** Configure customer-managed key (CMK) for Azure Blob Storage encryption
- **Azure Blob Storage:** Enable SSE with CMK (replaces app-level encryption)
- No new Vercel configuration required

## Security Considerations

- **GDPR Article 32:** Azure SSE with AES-256 + CMK satisfies the encryption requirement for personal data at rest
- **ISO 27002 Control 8.24:** CMK via Key Vault provides centralized, auditable key management — stronger than application-level key management
- **Recall URL handling:** Download URLs are temporary/signed and are not persisted. They are used immediately and discarded.
