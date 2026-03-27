# Sentry Integration Design

**Issue:** INO2-556
**Date:** 2026-03-27
**Status:** Draft

## Context

Inovy deploys to both Vercel and Azure (Container App Jobs for crons). The Vercel Sentry integration has been initialized, scaffolding the base config files. The DSN points to Sentry's EU data center (`de.sentry.io`), aligning with our Dutch gov AVG compliance requirements.

**Existing scaffolding (created by Sentry wizard):**

- `sentry.server.config.ts` — server-side init
- `sentry.edge.config.ts` — edge runtime init
- `src/instrumentation-client.ts` — client-side init with router transition capture
- `src/instrumentation.ts` — runtime detection, `onRequestError` capture
- `next.config.ts` — wrapped with `withSentryConfig`, source maps upload, tunnel route `/monitoring`, `automaticVercelMonitors: true`

**What remains:** production tuning, PII removal, wiring into existing error paths, and alert rule setup.

## Design Decisions

- **PII disabled everywhere** (`sendDefaultPii: false` on server, edge, and client) for AVG compliance
- **Single Sentry project** for both Vercel and Azure cron jobs — crons are Next.js API route handlers hit via HTTP, so they run within the app and are captured by the server-side config
- **Minimal wiring approach** — lean on Sentry's auto-instrumentation for tracing; manually capture errors only at critical failure points where errors would otherwise be silent
- **Rich non-PII context** at every capture point — IDs, counts, durations, statuses, technical identifiers. Never names, emails, or IPs.
- **`after()` for non-blocking captures** — in webhook and cron handlers, wrap `Sentry.captureException()` in Next.js `after()` so error reporting does not block the HTTP response (per `server-after-nonblocking` best practice)
- **`unstable_rethrow()` in catch blocks** — before capturing to Sentry, re-throw Next.js internal errors (`redirect`, `notFound`, etc.) per Next.js error handling best practices

## Section 1: Config Tuning

Adjust the 3 existing Sentry config files.

### All environments (server, edge, client)

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  enableLogs: true,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  ignoreErrors: [
    // Browser noise
    "ResizeObserver loop",
    "ResizeObserver loop completed with undelivered notifications",
    // Network noise
    "Failed to fetch",
    "Load failed",
    "NetworkError",
    "AbortError",
    // Navigation cancellations
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
  ],
});
```

### Client-specific additions (`instrumentation-client.ts`)

```typescript
Sentry.init({
  // ... shared config above
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
```

### Server-specific additions (`sentry.server.config.ts`)

```typescript
Sentry.init({
  // ... shared config above
  spotlight: process.env.NODE_ENV === "development",
});
```

### DSN management

Move the hardcoded DSN to an environment variable `NEXT_PUBLIC_SENTRY_DSN`. Remove the inline DSN from all 3 config files. Add `NEXT_PUBLIC_SENTRY_DSN` to `.env.local` and Vercel environment variables.

## Section 2: Error Boundary Integration

Wire `Sentry.captureException()` into the 4 existing error boundaries. Each boundary already logs via `logger.error()` in a `useEffect`. Add the Sentry capture alongside — do not remove existing logging.

### Files to modify

| File                              | Boundary tag |
| --------------------------------- | ------------ |
| `src/app/global-error.tsx`        | `global`     |
| `src/app/(main)/error.tsx`        | `dashboard`  |
| `src/app/(main)/chat/error.tsx`   | `chat`       |
| `src/app/(main)/record/error.tsx` | `record`     |

### Pattern

```typescript
useEffect(() => {
  logger.error("Error occurred", {
    component: "...",
    error,
    digest: error.digest,
  });
  Sentry.captureException(error, {
    tags: { boundary: "global" },
    contexts: { error_info: { digest: error.digest } },
  });
}, [error]);
```

Import `* as Sentry from "@sentry/nextjs"` at the top of each file. No other changes to UI or recovery logic.

## Section 3: Critical Error Path Instrumentation

Add `Sentry.captureException()` with structured non-PII context at key failure points. Use `Sentry.withScope()` to attach context without polluting the global scope. Use `after()` from `next/server` to make Sentry captures non-blocking in route handlers. Use `unstable_rethrow()` before Sentry capture in catch blocks to avoid swallowing Next.js navigation errors.

### 3a: Recall.ai Webhook (`src/app/api/webhooks/recall/route.ts`)

This webhook always returns 200 by design — errors are invisible to the caller. Sentry capture is critical here.

**Context to attach:**

- `bot_id`, `bot_status`, `bot_session_id`
- `event_type`, `recording_id`
- `meeting_platform`, `org_id`
- `timestamp`, `error_message`

**Pattern:**

```typescript
import { after } from "next/server";
import { unstable_rethrow } from "next/navigation";

// In existing catch blocks:
catch (error) {
  unstable_rethrow(error);
  logger.error("Recall webhook processing failed", { ... });
  after(() => {
    Sentry.withScope((scope) => {
      scope.setTags({ component: "recall-webhook", event_type });
      scope.setContext("bot", { bot_id, bot_status, bot_session_id, meeting_platform });
      scope.setContext("recording", { recording_id, org_id });
      Sentry.captureException(error);
    });
  });
}
```

### 3b: Google Drive Webhook (`src/app/api/webhooks/google-drive/route.ts`)

Fire-and-forget async processing. Same pattern.

**Context to attach:**

- `watch_channel_id`, `resource_id`
- `change_type`, `folder_id`
- `org_id`, `error_message`

### 3c: Cron Jobs (7 routes)

All cron routes already catch errors and log them. Add Sentry capture in existing catch blocks.

**Files:**

- `src/app/api/cron/poll-bot-status/route.ts`
- `src/app/api/cron/monitor-calendar/route.ts`
- `src/app/api/cron/agenda-check/route.ts`
- `src/app/api/cron/data-retention/route.ts`
- `src/app/api/cron/backup-verification/route.ts`
- `src/app/api/cron/backfill-series/route.ts`
- `src/app/api/cron/renew-drive-watches/route.ts`

**Shared context for all crons:**

- `cron_job` (name), `duration_ms`, `items_processed`, `items_failed`, `error_count`

**Job-specific context:**

- `poll-bot-status`: `active_bots_count`, `status_changes_count`, `failed_bots`
- `monitor-calendar`: `calendars_checked`, `events_found`, `sync_errors_count`
- `agenda-check`: `meetings_checked`, `bots_scheduled`, `scheduling_failures`
- `data-retention`: `records_deleted`, `storage_freed_mb`, `retention_policy`
- `backup-verification`: `backups_checked`, `integrity_status`, `last_backup_age_hours`
- `backfill-series`: `series_processed`, `series_created`, `series_updated`
- `renew-drive-watches`: `watches_renewed`, `watches_expired`, `renewal_failures`

**Pattern:**

```typescript
import { after } from "next/server";

// In existing catch blocks:
catch (error) {
  unstable_rethrow(error);
  logger.error("Cron job failed", { ... });
  after(() => {
    Sentry.withScope((scope) => {
      scope.setTags({ component: `cron-${jobName}` });
      scope.setContext("cron", { cron_job: jobName, duration_ms, items_processed, items_failed });
      Sentry.captureException(error);
    });
  });
}
```

### 3d: Workflow Pipeline (`src/workflows/convert-recording/index.ts`)

Capture at the top-level catch of `convertRecordingIntoAiInsights`. Do not instrument individual steps.

**Context to attach:**

- `recording_id`, `org_id`, `workflow_status`
- `step_failed`, `step_duration_ms`
- `meeting_platform`, `transcription_provider`
- `is_reprocessing`, `recall_bot_id`
- `total_duration_ms`, `steps_completed`

**Pattern:**

```typescript
catch (error) {
  Sentry.withScope((scope) => {
    scope.setTags({ component: "workflow", workflow: "convert-recording" });
    scope.setContext("recording", { recording_id, org_id, meeting_platform });
    scope.setContext("workflow", { status: "failed", step_failed, step_duration_ms, is_reprocessing, recall_bot_id, total_duration_ms, steps_completed });
    Sentry.captureException(error);
  });
}
```

Note: The workflow runs in a Cloudflare/Vercel background context (via the `workflow` package), not a standard route handler. `after()` is not applicable here — capture synchronously.

## Section 4: Sentry Alert Rules Setup Script

A TypeScript script at `scripts/sentry-setup-alerts.ts` that creates 3 alert rules via the Sentry API.

**Prerequisites:**

- `SENTRY_AUTH_TOKEN` env var with project-level API access
- `SENTRY_ORG` set to `inovy`
- `SENTRY_PROJECT` set to `sentry-inovy`

### Alert rules

| #   | Name                      | Filter                                       | Threshold  | Window |
| --- | ------------------------- | -------------------------------------------- | ---------- | ------ |
| 1   | Bot failure rate          | `component:recall-webhook` AND `level:error` | >10 events | 1 hour |
| 2   | Unhandled exception spike | `handled:no`                                 | >20 events | 1 hour |
| 3   | Stripe webhook errors     | `component:stripe-webhook` AND `level:error` | >1 event   | 1 hour |

All alerts notify via Sentry's default notification method (email to project members).

**Script behavior:**

- Idempotent — checks for existing rules by name before creating
- Uses Sentry REST API (`/api/0/projects/{org}/{project}/rules/`)
- Run via `npx tsx scripts/sentry-setup-alerts.ts`
- Outputs created/skipped status for each rule

## Section 5: CSP and Final Config

### CSP

No changes needed. The tunnel route at `/monitoring` (configured in `next.config.ts` via `tunnelRoute`) proxies Sentry requests through the app's own domain. This bypasses ad-blockers and avoids CSP `connect-src` additions.

### Package verification

Verify `@sentry/nextjs` is in `package.json` dependencies (installed by the wizard). No additional Sentry packages needed.

### Session Replay

The `@sentry/nextjs` SDK includes replay capabilities. The client config enables it with `replaysSessionSampleRate: 0.1` (10% of sessions) and `replaysOnErrorSampleRate: 1.0` (100% of error sessions). This provides visual reproduction of client-side errors without additional packages.

## Files Changed Summary

| File                                            | Change                                                      |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `sentry.server.config.ts`                       | Tune config: DSN from env, PII off, sample rates, spotlight |
| `sentry.edge.config.ts`                         | Tune config: DSN from env, PII off, sample rates            |
| `src/instrumentation-client.ts`                 | Tune config: DSN from env, PII off, sample rates, replay    |
| `src/app/global-error.tsx`                      | Add `Sentry.captureException()`                             |
| `src/app/(main)/error.tsx`                      | Add `Sentry.captureException()`                             |
| `src/app/(main)/chat/error.tsx`                 | Add `Sentry.captureException()`                             |
| `src/app/(main)/record/error.tsx`               | Add `Sentry.captureException()`                             |
| `src/app/api/webhooks/recall/route.ts`          | Add Sentry capture with bot/recording context               |
| `src/app/api/webhooks/google-drive/route.ts`    | Add Sentry capture with drive context                       |
| `src/app/api/cron/poll-bot-status/route.ts`     | Add Sentry capture with cron context                        |
| `src/app/api/cron/monitor-calendar/route.ts`    | Add Sentry capture with cron context                        |
| `src/app/api/cron/agenda-check/route.ts`        | Add Sentry capture with cron context                        |
| `src/app/api/cron/data-retention/route.ts`      | Add Sentry capture with cron context                        |
| `src/app/api/cron/backup-verification/route.ts` | Add Sentry capture with cron context                        |
| `src/app/api/cron/backfill-series/route.ts`     | Add Sentry capture with cron context                        |
| `src/app/api/cron/renew-drive-watches/route.ts` | Add Sentry capture with cron context                        |
| `src/workflows/convert-recording/index.ts`      | Add Sentry capture with workflow context                    |
| `scripts/sentry-setup-alerts.ts`                | New: alert rules setup script                               |
| `.env.local`                                    | Add `NEXT_PUBLIC_SENTRY_DSN`                                |

## Out of Scope

- Custom Sentry transactions/spans for individual workflow steps (deferred to when volume warrants it)
- Cron job failure alert rule (skipped — some crons may still be broken)
- Stripe webhook handler instrumentation (INO2-542 not built yet — alert rule is pre-wired)
- Deep performance tracing of the meeting pipeline
