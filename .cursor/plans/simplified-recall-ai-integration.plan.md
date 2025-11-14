<!-- a292dbf6-5568-4cf1-bcad-178ae876b8e4 93ef0dcd-1434-4062-9ace-4f4853fff50c -->

# Simplified Google Meet Bot Integration with Recall.ai

## Overview

Implement a minimal integration with Recall.ai that allows starting bot sessions from project context, receives completed meeting recordings via webhook, and processes them through the existing AI insights workflow using Deepgram transcription. All bot orchestration and calendar monitoring will be handled by Recall.ai.

## Phase 1: Database Schema Updates

### BOT-001: Add 'bot' Recording Mode and Bot Session Tracking

- Add 'bot' to `recordingModeEnum` in recordings schema
- Create minimal `bot_sessions` table to track Recall.ai bot state:
- `id` (UUID), `recordingId` (UUID, nullable FK to recordings), `projectId` (UUID, FK to projects)
- `organizationId` (text), `userId` (text)
- `recallBotId` (text) - Recall.ai bot session ID
- `recallStatus` (text) - Status from Recall.ai (e.g., 'joining', 'active', 'completed', 'failed')
- `meetingUrl` (text), `meetingTitle` (text)
- `createdAt`, `updatedAt`
- Create Drizzle schema files and migration

**Files:**

- `apps/web/src/server/db/schema/recordings.ts` - Update `recordingModeEnum`
- `apps/web/src/server/db/schema/bot-sessions.ts` - New bot sessions schema
- `apps/web/src/server/db/migrations/[timestamp]_add_bot_recording_mode_and_sessions.sql` - Migration file
- `apps/web/src/server/data-access/bot-sessions.queries.ts` - Basic queries for bot sessions

## Phase 2: Bot Session Initiation

### BOT-002: Start Bot Session from Project Context

- Create server action `startBotSessionAction` to initiate Recall.ai bot session:
- Accepts `projectId`, `meetingUrl`, `meetingTitle` (optional)
- Calls Recall.ai API to create bot session with custom metadata containing `projectId`
- Creates `bot_sessions` entry with Recall.ai bot ID and initial status
- Returns bot session details
- Add RBAC checks to ensure user has access to project
- Handle Recall.ai API errors with neverthrow Result pattern

**Files:**

- `apps/web/src/features/bot/actions/start-bot-session.ts` - Server action
- `apps/web/src/server/services/recall-api.service.ts` - Recall.ai API client
- `apps/web/src/server/validation/bot/start-bot-session.schema.ts` - Validation schema

## Phase 3: Webhook Handler

### BOT-003: Recall.ai Webhook Integration

- Create webhook endpoint `/api/webhooks/recall` to receive Recall.ai events
- Verify HMAC-SHA256 signatures using `RECALL_WEBHOOK_SECRET`
- Handle `bot.recording_ready` event:
- Extract `projectId` from custom metadata
- Extract recording metadata (title, duration, file URL, meeting details)
- Download recording file from Recall.ai
- Upload to Vercel Blob storage
- Create Recording entry with `recordingMode: 'bot'` and link to project
- Update `bot_sessions` entry with `recordingId` and status
- Trigger `convertRecordingIntoAiInsights` workflow (uses existing Deepgram transcription)
- Handle `bot.status_change` events:
- Update `bot_sessions.recallStatus` for tracking
- Link to recording when recording is created
- Implement idempotent event processing to prevent duplicate recordings
- Error handling with proper logging

**Files:**

- `apps/web/src/app/api/webhooks/recall/route.ts` - Webhook handler
- `apps/web/src/server/services/bot-webhook.service.ts` - Webhook processing logic
- `apps/web/src/server/validation/bot/recall-webhook.schema.ts` - Webhook payload validation

## Technical Considerations

### Recall.ai Integration

- Use Recall.ai API to create bot sessions with custom metadata (`projectId`)
- Download recordings from Recall.ai and upload to Vercel Blob (Recall.ai URLs may be temporary)
- Use existing Deepgram transcription workflow (skip Recall.ai transcription)
- Track bot session state in `bot_sessions` table for monitoring/debugging

### Integration Points

- Use existing `RecordingService` for creating recordings
- Integrate with existing `convertRecordingIntoAiInsights` workflow
- Use existing Vercel Blob storage utilities for file uploads
- Leverage existing project access checks and RBAC

### Error Handling

- All operations use neverthrow Result pattern
- Comprehensive logging with context
- Idempotent webhook processing
- User-friendly error messages

### Security

- Webhook signature verification (HMAC-SHA256)
- RBAC enforcement for bot session creation
- Validate webhook payloads before processing
- Organization isolation checks

## Dependencies

- Existing recording workflow (`apps/web/src/workflows/convert-recording/`)
- Existing RecordingService
- Existing Vercel Blob storage utilities
- Recall.ai API and webhook configuration

## Environment Variables

- `RECALL_API_KEY` - Recall.ai API key for creating bot sessions
- `RECALL_WEBHOOK_SECRET` - Secret for webhook signature verification

## Testing Strategy

- Webhook signature verification tests
- Idempotent event processing tests
- Error handling tests
- Integration tests with mock Recall.ai API and webhook payloads

## To-dos

- [ ] BOT-001: Add 'bot' to recordingModeEnum and create minimal bot_sessions table schema with migration
- [ ] BOT-001: Create data access layer queries for bot_sessions
- [ ] BOT-002: Create server action to start bot session from project context with Recall.ai API integration
- [ ] BOT-003: Create Recall.ai webhook handler with signature verification
- [ ] BOT-003: Implement webhook processing logic to download recordings, upload to Vercel Blob, and create Recording entries
