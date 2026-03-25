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

**Recall URL expiry:** Recall download URLs are temporary/signed. Both workflows kick off immediately from the webhook handler, so expiry is not a concern.

## Failure Handling

The two workflows are independent. Partial failures are handled via status fields on the recording:

| Scenario                              | Result                                                        | User Experience                                                    |
| ------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| Transcription succeeds, storage fails | `transcriptionStatus: "completed"`, `storageStatus: "failed"` | Can see transcript/summary, cannot play recording                  |
| Storage succeeds, transcription fails | `storageStatus: "completed"`, `transcriptionStatus: "failed"` | Can play recording, no transcript (existing retry logic applies)   |
| Both fail                             | Both statuses `"failed"`                                      | Recording entry exists with metadata, both retryable independently |

Each workflow can be retried independently without affecting the other.

## Changes

### Modify

1. **`bot-webhook.service.ts`** — `processRecordingDone` becomes a thin dispatcher:
   - Create recording DB entry with Recall metadata (no file URL yet)
   - Update bot session
   - Kick off transcription and storage workflows in parallel
   - Remove all download/encrypt/upload logic

2. **`TranscriptionService`** — Accept a direct URL (Recall download URL) in addition to blob storage URLs. When the URL is not a blob storage URL, skip `resolveFetchableUrl()` SAS resolution and pass it directly to Deepgram.

3. **`StorageProvider` interface** — Add `copyFromURL(sourceUrl: string, destinationPath: string): Promise<CopyResult>` method.

4. **Azure storage implementation** — Implement `copyFromURL` using Azure Blob SDK's `beginCopyFromURL`. Poll for copy completion.

5. **Recording DB schema** — Add `storageStatus` field with values: `pending` | `processing` | `completed` | `failed`. The existing `transcriptionStatus` field continues to track transcription state.

### Create

1. **Storage workflow** (`src/workflows/store-recording/`) — New workflow:
   - Fetches Recall download URL
   - Calls `storageProvider.copyFromURL()`
   - Updates recording DB entry with blob URL, fileSize, mimeType
   - Updates `storageStatus` throughout

### Remove

1. **App-level encryption in recording flow** — The `downloadRecording()` helper, buffer encryption step, and encryption metadata in `processRecordingDone` become unused for bot recordings. Remove or gate behind a flag.
2. **`ENABLE_ENCRYPTION_AT_REST` usage in recording flow** — No longer needed for bot recordings since Azure SSE handles encryption.

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
