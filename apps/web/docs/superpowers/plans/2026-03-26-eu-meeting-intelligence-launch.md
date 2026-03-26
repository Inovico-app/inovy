# EU Meeting Intelligence Launch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Inovy to first paying Dutch government and business customers in 12 weeks.

**Architecture:** Fix existing broken plumbing (post-actions, cron frequency, real-time transcription), add Stripe billing via Better Auth plugin, build Dutch gov compliance differentiators (AVG dashboard, Works Council consent, DPA generation), polish onboarding and trial conversion, and harden for production.

**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle ORM, PostgreSQL (Neon), Recall.ai, Deepgram, Claude/OpenAI, Stripe, Resend, Azure Functions, Terraform, Vitest, next-intl, @react-pdf/renderer, @sentry/nextjs

**Spec:** `docs/superpowers/specs/2026-03-26-eu-meeting-intelligence-launch-design.md`

---

## Phase 1: Make It Work (Weeks 1-3)

### Task 1: Implement `send_summary_email` Post-Action

**Files:**

- Modify: `src/server/services/post-action-executor.service.ts` — method `executeSendSummaryEmail`
- Create: `src/emails/templates/summary-email.tsx`
- Create: `src/server/services/__tests__/post-action-send-email.test.ts`

**Context:** The `PostActionExecutorService` has a stub method `executeSendSummaryEmail` (currently just a logger call). It receives a `Meeting` object. You need to: fetch the recording + AI summary for the meeting, get participant emails, render a summary email template, and send via Resend using the existing `sendEmailFromTemplate` from `src/emails/client.ts` (no modification to client.ts needed — it already supports React Email templates). Look at existing templates in `src/emails/templates/` (e.g., `stripe-trial-started.tsx`) for the pattern — they use `@react-email/components` and the `base-template.tsx` wrapper.

**Note on participant data:** There is no `MeetingParticipantsQueries` class — you need to get participant emails from the `meeting_participants` table via `MeetingsQueries` or by creating a simple query in the meetings data access layer. Check `src/server/db/schema/meeting-participants.ts` for the schema and `src/server/data-access/meetings.queries.ts` for existing patterns.

- [ ] **Step 1: Write the failing test for send_summary_email**

Create test file. Mock `RecordingsQueries`, `AiInsightsQueries`, `MeetingsQueries` (for participant data), and `sendEmailFromTemplate`. Test that given a meeting with a recording that has a summary, the method fetches summary data, renders the email template, and calls `sendEmailFromTemplate` with correct participant emails and subject.

Run: `pnpm vitest run src/server/services/__tests__/post-action-send-email.test.ts`
Expected: FAIL — method is a stub

- [ ] **Step 2: Create the summary email template**

Create `src/emails/templates/summary-email.tsx`. Use `base-template.tsx` as the wrapper. Props: `meetingTitle: string`, `summary: string`, `actionItems: { text: string; assignee?: string }[]`, `decisions: string[]`, `recordingUrl: string`. Render: meeting title as heading, summary text, bulleted action items, bulleted decisions, and a "View Recording" button linking to `recordingUrl`.

- [ ] **Step 3: Implement executeSendSummaryEmail**

In `post-action-executor.service.ts`, replace the `executeSendSummaryEmail` stub:

1. Fetch recording linked to meeting via `RecordingsQueries`
2. Fetch AI insights (summary, action_items, decisions) via `AiInsightsQueries`
3. Fetch meeting participants (emails) — add a query to `MeetingsQueries` if one doesn't exist for fetching participants by meetingId
4. Generate a share token via `MeetingShareTokensQueries`
5. Build recording URL from share token
6. Call `sendEmailFromTemplate` with the `SummaryEmail` component, participant emails, and subject `"Samenvatting: {meetingTitle}"`

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/server/services/__tests__/post-action-send-email.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/services/post-action-executor.service.ts src/emails/templates/summary-email.tsx src/server/services/__tests__/post-action-send-email.test.ts
git commit -m "feat: implement send_summary_email post-action"
```

---

### Task 2: Implement `create_tasks` Post-Action

**Files:**

- Modify: `src/server/services/post-action-executor.service.ts` — method `executeCreateTasks`
- Create: `src/server/services/__tests__/post-action-create-tasks.test.ts`

**Context:** The `executeCreateTasks` stub needs to: fetch AI-extracted tasks from the recording's `ai_insights` (type `action_items`), match assignee names to meeting participants, and create task records linked to the meeting's project. Use `TasksQueries` for DB writes. Check `src/server/db/schema/tasks.ts` for the task schema and `src/server/data-access/tasks.queries.ts` for existing query methods.

- [ ] **Step 1: Write the failing test**

Test: given a meeting with a recording that has AI-extracted action items, the method creates tasks in the DB with correct project linkage, assignees matched by speaker name, and confidence scores preserved.

Run: `pnpm vitest run src/server/services/__tests__/post-action-create-tasks.test.ts`
Expected: FAIL

- [ ] **Step 2: Implement executeCreateTasks**

Replace stub at line 138-150:

1. Find recording for meeting via `RecordingsQueries`
2. Fetch `action_items` insight via `AiInsightsQueries`
3. Fetch meeting participants for assignee matching
4. For each action item: fuzzy match assignee name to participant, create task via `TasksQueries.create()` with `source: "ai"`, `meetingId`, `projectId`, `confidence`

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm vitest run src/server/services/__tests__/post-action-create-tasks.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/services/post-action-executor.service.ts src/server/services/__tests__/post-action-create-tasks.test.ts
git commit -m "feat: implement create_tasks post-action"
```

---

### Task 3: Implement `share_recording` Post-Action

**Files:**

- Modify: `src/server/services/post-action-executor.service.ts` — method `executeShareRecording`
- Create: `src/server/services/__tests__/post-action-share-recording.test.ts`

**Context:** The `executeShareRecording` stub needs to: generate a `meeting_share_token` (check `src/server/db/schema/meeting-share-tokens.ts` for schema), set 30-day expiry with `requiresAuth: true` and `requiresOrgMembership: true`, then send a notification and/or email with the share link.

- [ ] **Step 1: Write the failing test**

Test: given a meeting, creates a share token with correct expiry and permissions, and sends notification to meeting creator.

Run: `pnpm vitest run src/server/services/__tests__/post-action-share-recording.test.ts`
Expected: FAIL

- [ ] **Step 2: Implement executeShareRecording**

Replace stub at line 152-163:

1. Generate share token via `MeetingShareTokensQueries.create()` with 30-day expiry
2. Build share URL: `${process.env.NEXT_PUBLIC_APP_URL}/meetings/${meeting.id}?token=${token}`
3. Send notification via `NotificationService.createNotification()` (type: `recording_processed`)

- [ ] **Step 3: Run test and commit**

Run: `pnpm vitest run src/server/services/__tests__/post-action-share-recording.test.ts`
Expected: PASS

```bash
git add src/server/services/post-action-executor.service.ts src/server/services/__tests__/post-action-share-recording.test.ts
git commit -m "feat: implement share_recording post-action"
```

---

### Task 4: Wire Recall.ai Real-Time Transcription — Schema

**Files:**

- Create: `src/server/db/schema/transcript-chunks.ts`
- Modify: `src/server/db/schema/index.ts` (add export)
- Create: `src/server/data-access/transcript-chunks.queries.ts`

**Context:** Recall.ai sends `transcript.data` webhook events with partial transcript objects during a live bot session. We need a table to store these chunks, then stitch them into a final transcript when the session completes. Check `src/server/db/schema/bot-sessions.ts` and `src/server/db/schema/recordings.ts` for FK reference patterns.

- [ ] **Step 1: Create transcript_chunks schema**

```typescript
// src/server/db/schema/transcript-chunks.ts
import {
  boolean,
  index,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { botSessions } from "./bot-sessions";
import { recordings } from "./recordings";

export const transcriptChunks = pgTable(
  "transcript_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    botSessionId: uuid("bot_session_id")
      .notNull()
      .references(() => botSessions.id, { onDelete: "cascade" }),
    recordingId: uuid("recording_id").references(() => recordings.id, {
      onDelete: "set null",
    }),
    speakerId: text("speaker_id"),
    text: text("text").notNull(),
    startTime: real("start_time").notNull(),
    endTime: real("end_time").notNull(),
    confidence: real("confidence"),
    isFinal: boolean("is_final").notNull().default(false),
    language: text("language"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    recordingTimeIdx: index("transcript_chunks_recording_time_idx").on(
      table.recordingId,
      table.startTime,
    ),
    sessionIdx: index("transcript_chunks_session_idx").on(table.botSessionId),
  }),
);

export type TranscriptChunk = typeof transcriptChunks.$inferSelect;
export type NewTranscriptChunk = typeof transcriptChunks.$inferInsert;
```

- [ ] **Step 2: Create queries file**

Create `src/server/data-access/transcript-chunks.queries.ts` with:

- `insertChunk(chunk: NewTranscriptChunk)` — insert a single chunk
- `insertChunks(chunks: NewTranscriptChunk[])` — batch insert
- `findBySessionId(sessionId: string)` — get all chunks for a session, ordered by `startTime`
- `findByRecordingId(recordingId: string)` — get all chunks for a recording, ordered by `startTime`
- `countBySessionId(sessionId: string)` — count chunks for completeness check

- [ ] **Step 3: Export from schema index and generate migration**

Add export to `src/server/db/schema/index.ts`.
Run: `pnpm db:generate --name add-transcript-chunks`

- [ ] **Step 4: Commit**

```bash
git add src/server/db/schema/transcript-chunks.ts src/server/db/schema/index.ts src/server/data-access/transcript-chunks.queries.ts
git commit -m "feat: add transcript_chunks schema and queries"
```

---

### Task 5: Wire Recall.ai Real-Time Transcription — Webhook Handler

**Files:**

- Modify: `src/server/services/bot-webhook.service.ts`
- Modify: `src/app/api/webhooks/recall/route.ts`
- Modify: `src/server/validation/bot/recall-webhook.schema.ts` (add transcript event type)
- Create: `src/server/services/__tests__/bot-webhook-transcript.test.ts`

**Context:** The webhook route at `src/app/api/webhooks/recall/route.ts` dispatches to `BotWebhookService` methods based on event type. Currently handles: `bot.status_change`, `bot.*` status events, `recording.done`, `recording.failed`, `recording.deleted`, `participant_events.chat_message`. Need to add `transcript.data` handler. Check the Recall.ai docs (use context7 MCP or web search) for the exact payload shape of `transcript.data` events.

- [ ] **Step 1: Write the failing test**

Test: given a `transcript.data` webhook event with speaker ID, text, timestamps, the handler inserts a `TranscriptChunk` record linked to the correct bot session.

Run: `pnpm vitest run src/server/services/__tests__/bot-webhook-transcript.test.ts`
Expected: FAIL

- [ ] **Step 2: Add transcript event validation schema**

In `src/server/validation/bot/recall-webhook.schema.ts`, add a Zod schema for the `transcript.data` event payload. Include: `event: "transcript.data"`, `data.bot.id`, `data.data.words[]` (each with `text`, `start_timestamp`, `end_timestamp`, `speaker_id`, `confidence`).

- [ ] **Step 3: Add processTranscriptData to BotWebhookService**

Add a new static method `processTranscriptData` to `BotWebhookService` in `src/server/services/bot-webhook.service.ts`:

1. Extract bot ID from event
2. Look up bot session via `BotSessionsQueries.findByRecallBotIdOnly(botId)`
3. Map each word/utterance to a `NewTranscriptChunk`
4. Batch insert via `TranscriptChunksQueries.insertChunks()`

- [ ] **Step 4: Route the event in the webhook handler**

In `src/app/api/webhooks/recall/route.ts`, add a case for `transcript.data` that calls `BotWebhookService.processTranscriptData(event)`.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/server/services/__tests__/bot-webhook-transcript.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/server/services/bot-webhook.service.ts src/app/api/webhooks/recall/route.ts src/server/validation/bot/recall-webhook.schema.ts src/server/services/__tests__/bot-webhook-transcript.test.ts
git commit -m "feat: handle Recall.ai transcript.data webhook events"
```

---

### Task 6: Transcript Assembly — Stitch Chunks Into Final Transcript

**Files:**

- Create: `src/server/services/transcript-assembly.service.ts`
- Modify: `src/workflows/convert-recording/index.ts`
- Create: `src/server/services/__tests__/transcript-assembly.test.ts`

**Context:** After a bot session completes and `recording.done` fires, the AI workflow starts and calls `executeTranscriptionStep` which hits Deepgram. We want to first check if we have real-time transcript chunks — if we have sufficient coverage (>50% of expected duration), assemble them into the final transcript and skip Deepgram. The workflow is at `src/workflows/convert-recording/index.ts`, transcription step at `src/workflows/convert-recording/steps/step-transcription.ts`.

- [ ] **Step 1: Write failing test for transcript assembly**

Test `TranscriptAssemblyService.assembleFromChunks(recordingId)`:

- Given chunks with different speakers, ordered by startTime, produces a formatted transcript text with speaker labels
- Given insufficient chunks (< 50% coverage), returns `null` (signaling fallback to Deepgram)

Run: `pnpm vitest run src/server/services/__tests__/transcript-assembly.test.ts`
Expected: FAIL

- [ ] **Step 2: Implement TranscriptAssemblyService**

```typescript
// src/server/services/transcript-assembly.service.ts
export class TranscriptAssemblyService {
  /**
   * Attempt to assemble a transcript from real-time chunks.
   * Returns null if insufficient coverage (< 50% of expected duration).
   */
  static async assembleFromChunks(
    recordingId: string,
    expectedDurationSeconds?: number,
  ): Promise<string | null> {
    // 1. Fetch all chunks for recording, ordered by startTime
    // 2. If expectedDuration provided, check coverage (last chunk endTime / expectedDuration)
    // 3. Group consecutive chunks by speakerId
    // 4. Format as "Speaker {id}: {text}\n\n" blocks
    // 5. Return assembled text
  }
}
```

- [ ] **Step 3: Integrate into workflow**

In `src/workflows/convert-recording/index.ts`, inside the `if (!isReprocessing || !transcriptionText)` block (around line 69), **before** the Deepgram call at `executeTranscriptionStep` (around line 92), add:

1. Try `TranscriptAssemblyService.assembleFromChunks(recordingId)`
2. If it returns text, write to `recordings.transcriptionText` via `RecordingsQueries.update()` and set `transcriptionText` variable, then skip the Deepgram `executeTranscriptionStep` call
3. If null, proceed with Deepgram as before

The key is to insert this inside the existing `if` block so it only runs when transcription is needed, and before the Deepgram API call.

- [ ] **Step 4: Run test to verify**

Run: `pnpm vitest run src/server/services/__tests__/transcript-assembly.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/services/transcript-assembly.service.ts src/workflows/convert-recording/index.ts src/server/services/__tests__/transcript-assembly.test.ts
git commit -m "feat: assemble real-time transcript chunks with Deepgram fallback"
```

---

### Task 7: Enable Transcription in Recall.ai Bot Creation

**Files:**

- Modify: `src/server/services/bot-providers/recall/recall-provider.ts`
- Modify: `src/server/services/recall-api.service.ts`

**Context:** The Recall.ai bot needs to be created with transcription enabled so that `transcript.data` events are sent. Check `recall-provider.ts` for how `createSession` builds the bot config, and `recall-api.service.ts` for the actual API call. Consult Recall.ai API docs for the `transcription_options` parameter.

- [ ] **Step 1: Research Recall.ai transcription config**

Use web search or context7 MCP to find the Recall.ai bot creation API parameter for enabling real-time transcription. Look for `transcription_options` or `real_time_transcription` in their API docs.

- [ ] **Step 2: Update bot creation to enable transcription**

In `recall-api.service.ts`, add the transcription configuration to the bot creation payload. In `recall-provider.ts`, pass any necessary config through from bot settings.

- [ ] **Step 3: Commit**

```bash
git add src/server/services/bot-providers/recall/recall-provider.ts src/server/services/recall-api.service.ts
git commit -m "feat: enable real-time transcription in Recall.ai bot config"
```

---

### Task 8: Create Azure Functions Infrastructure (Terraform)

**Files:**

- Create: `infra/terraform/main.tf`
- Create: `infra/terraform/variables.tf`
- Create: `infra/terraform/outputs.tf`
- Create: `infra/terraform/functions/poll-bot-status/index.ts`
- Create: `infra/terraform/functions/monitor-calendar/index.ts`
- Create: `infra/terraform/functions/backfill-series/index.ts`

**Context:** This is greenfield infrastructure. Azure Functions (Consumption plan, EU West) will call the existing Vercel API routes via HTTP with `CRON_SECRET` auth. The functions are thin HTTP triggers — they don't duplicate business logic.

- [ ] **Step 1: Create Terraform config**

`main.tf`: Azure Resource Group (EU West), Storage Account, App Service Plan (Consumption), Function App with Node.js runtime. Configure environment variables: `CRON_SECRET`, `VERCEL_API_URL`.

`variables.tf`: `cron_secret`, `vercel_api_url`, `resource_group_name`, `location` (default: `westeurope`).

`outputs.tf`: Function App URL, Resource Group name.

- [ ] **Step 2: Create function implementations**

Each function is a timer trigger that makes an HTTP POST to the corresponding Vercel API route:

```typescript
// poll-bot-status: runs every 2 minutes
// POST ${VERCEL_API_URL}/api/cron/poll-bot-status
// Authorization: Bearer ${CRON_SECRET}

// monitor-calendar: runs every 15 minutes
// POST ${VERCEL_API_URL}/api/cron/monitor-calendar

// backfill-series: runs every 2 hours
// POST ${VERCEL_API_URL}/api/cron/backfill-series
```

- [ ] **Step 3: Update vercel.json**

Remove cron entries for `poll-bot-status`, `monitor-calendar`, and `backfill-series` from `vercel.json`. Update `agenda-check` to `0 */6 * * *` (every 6 hours).

NOTE: Keep the Vercel API routes themselves intact — only remove the cron schedule entries. Azure Functions will call these same routes.

- [ ] **Step 4: Document deployment steps**

Add `infra/terraform/README.md` with: `terraform init`, `terraform plan`, `terraform apply` commands and required variables.

- [ ] **Step 5: Commit**

```bash
git add infra/terraform/ apps/web/vercel.json
git commit -m "feat: Azure Functions infrastructure for high-frequency crons"
```

---

### Task 9: End-to-End Pipeline Validation

**Files:**

- Create: `src/workflows/convert-recording/__tests__/workflow-integration.test.ts`

**Context:** After Tasks 1-8, the full pipeline should work. This task is manual + automated validation.

- [ ] **Step 1: Verify post-actions wiring**

Read `src/workflows/convert-recording/steps/step-post-actions.ts` and confirm it calls `PostActionExecutorService.executePostActions(meetingId, organizationId)`. Verify the workflow (`src/workflows/convert-recording/index.ts`) calls `executePostActionsStep` after the parallel summary/task extraction. This wiring is already correct — this step is a verification, not a code change.

- [ ] **Step 2: Write integration test for the workflow**

Test that `convertRecordingIntoAiInsights` called with a valid recording ID:

1. Calls transcription step (or uses assembled chunks)
2. Calls summary + task extraction in parallel
3. Calls post-actions step
4. Sends success notification

Mock external services (Deepgram, Claude) but test the orchestration logic.

- [ ] **Step 3: Run all tests**

Run: `pnpm vitest run`
Expected: All tests pass

- [ ] **Step 4: Manual E2E test**

1. Schedule a test meeting on Google Meet
2. Verify bot joins (check `/bot/sessions` page)
3. Speak in Dutch for 2-3 minutes
4. End meeting
5. Check: transcript appears, summary generated, tasks extracted, email sent
6. Document any failures

- [ ] **Step 5: Fix any issues found**

Address bugs from manual testing. Focus on:

- Transcript chunk ordering
- Post-action error handling (should not block pipeline)
- Email template rendering

- [ ] **Step 6: Commit fixes**

```bash
git add -A
git commit -m "fix: pipeline validation fixes"
```

---

## Phase 2: Make It Dutch Gov (Weeks 4-7)

> Each task below will be expanded into full step-by-step detail when Phase 1 is complete.

### Task 10: Register @better-auth/stripe Plugin

**Files:**

- Modify: `src/lib/auth.ts` — add stripe plugin to plugins array
- Run Better Auth schema generation for Stripe tables
- Create Drizzle migration

**Summary:** The plugin is installed but not registered. Add it to the auth config, generate its required schema tables, create migration. Reference existing plugins in `auth.ts` for the pattern.

---

### Task 11: Stripe Products, Prices, and Webhook Handler

**Files:**

- Create: `src/app/api/webhooks/stripe/route.ts`
- Create: `src/server/services/billing.service.ts`

**Summary:** Create 3 Stripe products with 6 prices (monthly + annual per tier). Build webhook handler for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Wire existing email templates (`stripe-trial-started.tsx`, etc.) to billing events.

---

### Task 12: Feature Gating Middleware

**Files:**

- Create: `src/middleware/subscription-gate.ts`
- Create: `src/middleware.ts` (does not exist yet — create Next.js middleware file)

**Summary:** Middleware that checks org subscription tier before allowing actions. Enforce: seat limits (Starter: 5), recording hour caps (Starter: 40hrs/month), trial expiry (read-only after 14 days). Use org subscription state from Better Auth Stripe plugin.

---

### Task 13: Billing Settings UI

**Files:**

- Create: `src/app/(main)/settings/billing/page.tsx`
- Create: `src/app/(main)/settings/billing/components/`

**Summary:** Current plan display, usage meters, Stripe Customer Portal redirect, upgrade prompts. Pricing comparison component (reusable for marketing site).

---

### Task 14: AVG Compliance Dashboard

**Files:**

- Create: `src/app/(main)/admin/compliance/page.tsx`
- Create: `src/app/(main)/admin/compliance/components/`
- Create: `src/server/data-access/compliance-dashboard.queries.ts`

**Summary:** Dashboard showing consent rates, PII redactions, data retention status, privacy requests, audit log summary. PDF export via `@react-pdf/renderer`. Install `@react-pdf/renderer` as dependency.

---

### Task 15: Works Council (Ondernemingsraad) Consent Workflow

**Files:**

- Create: `src/server/db/schema/works-council-approvals.ts`
- Modify: `src/server/db/schema/consent.ts` — add `"works_council_approval"` to the `consentMethodEnum` TypeScript array (this is a text column with TS-level enum, NOT a Postgres native enum — no ALTER TYPE needed, just update the array)
- Create: `src/app/(main)/admin/compliance/works-council/page.tsx`
- Create: `src/server/services/works-council.service.ts`

**Summary:** New schema table, update TypeScript enum array in consent.ts, create migration for new table only. Upload UI, bulk consent creation for org members, individual opt-out support. Audit trail integration.

---

### Task 16: Self-Serve DPA (Verwerkersovereenkomst)

**Files:**

- Create: `src/app/(main)/admin/compliance/dpa/page.tsx`
- Create: `src/server/services/dpa-generator.service.ts`

**Summary:** Auto-generated DPA based on org settings. PDF generation via `@react-pdf/renderer`. Pre-filled with sub-processor list, data residency, retention period. Versioned downloads with audit trail.

---

### Task 17: next-intl Setup and Architecture

**Files:**

- Install: `next-intl`
- Create: `src/i18n/request.ts`
- Create: `messages/en.json`
- Create: `messages/nl.json`
- Modify: `src/middleware.ts` (created in Task 12, or create here if Task 12 not yet done)

**Summary:** Install and configure next-intl with cookie/header-based locale detection (no URL prefix). Set up message file structure, server component integration, and middleware for locale detection. Default to Dutch for Dutch browser locale.

---

### Task 18: Dutch UI Translation

**Files:**

- Modify: `messages/nl.json` — full Dutch translations
- Modify: All UI components — replace hardcoded strings with `useTranslations()` calls

**Summary:** Translate all UI strings to Dutch. Focus on high-traffic pages first: dashboard, recordings, meetings, settings. Use Claude Code for initial translation, manual review for naturalness.

---

### Task 19: Dutch Language Quality Validation

**Summary:** Test Deepgram Dutch accuracy with sample recordings (formal, informal, mixed). Tune Claude prompts for natural Dutch summary output. Validate task extraction produces natural Dutch action items.

---

## Phase 3: Make It Sellable (Weeks 8-10)

### Task 20: Onboarding Flow Redesign

**Files:**

- Modify: `src/app/(auth)/onboarding/` — redesign existing onboarding flow (note: under `(auth)` route group, not `(main)`)
- Create: Demo recording seed data

**Summary:** Streamline signup → first summary to under 10 minutes. Add empty states, demo recording, tooltip tour. Calendar auto-detection with per-meeting toggle.

---

### Task 21: Trial Email Sequence

**Files:**

- Create: `src/server/db/schema/trial-email-state.ts`
- Create: `src/app/api/cron/process-trial-emails/route.ts`
- Create: `src/emails/templates/trial-*.tsx` (welcome, summary-ready, usage, ending, last-day)

**Summary:** Event-triggered + time-triggered email sequence. New `trial_email_state` table. Daily cron for time-based emails. Hook into workflow completion for event-based emails.

---

### Task 22: Feature Gating UI Components

**Files:**

- Create: `src/components/billing/upgrade-prompt.tsx`
- Create: `src/components/billing/trial-badge.tsx`
- Modify: Sidebar layout — add trial days badge

**Summary:** Contextual upgrade prompts at limit boundaries. Trial days remaining badge. Pricing comparison modal.

---

### Task 23: Trust & Security Page

**Files:**

- Create: `src/app/(public)/security/page.tsx`
- Create: Security whitepaper PDF content

**Summary:** Public route with data residency, encryption, AVG compliance, sub-processor list, certifications. Downloadable security whitepaper. Update privacy policy and ToS with Dutch versions.

---

### Task 24: Status Page and Cookie Consent

**Summary:** Set up external status page (Instatus or similar). Add cookie consent banner if not present.

---

## Phase 4: Make It Reliable (Weeks 11-12)

### Task 25: Sentry Integration

**Files:**

- Install: `@sentry/nextjs`
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Create: `sentry.edge.config.ts`
- Modify: `next.config.ts`

**Summary:** Install and configure Sentry for Next.js 16 App Router. Source maps upload. 4 alert rules: bot failure rate, Stripe webhook errors, cron failures, unhandled exceptions.

---

### Task 26: Graceful Degradation

**Files:**

- Modify: `src/workflows/convert-recording/index.ts`
- Create: `src/server/services/provider-fallback.service.ts`

**Summary:** Claude → OpenAI fallback. Deepgram failure → queue for retry with user notification. Stripe webhook reconciliation cron. Circuit breaker improvements in workflow.

---

### Task 27: Billing Monitoring and Admin MRR View

**Files:**

- Create: `src/app/(main)/admin/billing/page.tsx`

**Summary:** Admin view of MRR, active trials, conversion rate. Query Stripe API for aggregate data.

---

### Task 28: Feedback Widget and Schema

**Files:**

- Create: `src/server/db/schema/feedback.ts`
- Create: `src/components/feedback/feedback-widget.tsx`

**Summary:** Thumbs up/down + optional comment after viewing summaries. Store in `feedback` table. Display in admin dashboard.

---

### Task 29: Data Integrity Validation

**Summary:** Verify audit log hash chain integrity. Test GDPR data export end-to-end. Test user deletion flow. Validate backup verification cron.

---

### Task 30: First Customer Onboarding Preparation

**Summary:** Prepare white-glove onboarding materials. Set up 30-day extended trial capability. Create onboarding checklist for customer calls. Reserve 50% of week 12 for feedback-driven fixes.

---

## Dependency Graph

```
Phase 1 (Weeks 1-3):
  Tasks 1-3 (post-actions) → can be parallel
  Tasks 4-7 (real-time transcription) → sequential (schema → handler → assembly → config)
  Task 8 (Azure infra) → independent
  Task 9 (E2E validation) → depends on all above

Phase 2 (Weeks 4-7):
  Tasks 10-13 (Stripe billing) → sequential
  Tasks 14-16 (compliance) → can be parallel after Task 10
  Tasks 17-18 (i18n) → sequential (setup → translation)
  Task 19 (language QA) → depends on 17-18

Phase 3 (Weeks 8-10):
  Task 20 (onboarding) → independent
  Task 21 (trial emails) → depends on Tasks 10-13 (billing)
  Task 22 (gating UI) → depends on Task 12 (middleware)
  Tasks 23-24 (trust) → independent

Phase 4 (Weeks 11-12):
  Tasks 25-26 (monitoring + resilience) → independent
  Task 27 (billing admin) → depends on Tasks 10-13
  Tasks 28-30 → independent
```
