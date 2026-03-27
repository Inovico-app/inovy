# Graceful Degradation Design Spec

**Linear:** INO2-557
**Project:** EU Meeting Intelligence Launch — Phase 4: Make It Reliable
**Date:** 2026-03-27

## Overview

Make the AI pipeline resilient to third-party provider outages. Three interconnected mechanisms:

1. **Circuit Breaker** — detect provider failures fast and stop hammering dead services
2. **LLM Provider Fallback** — route Claude-backed services to OpenAI when Anthropic is down
3. **Deepgram Retry Queue** — deferred retry for transcription failures with user notification

**Out of scope:** Stripe webhook reconciliation (deferred to billing stories INO2-541–544).

---

## 1. Circuit Breaker

### Problem

`ConnectionPoolService` has a primitive health model — a boolean `isHealthy` per pooled client with a 5-minute passive recovery. It doesn't distinguish between "one request failed" and "the provider is completely down", and keeps sending requests to a dead provider.

### Design

New `CircuitBreakerService` in `src/server/services/circuit-breaker.service.ts` — one instance per external provider (Anthropic, OpenAI, Deepgram).

### States

| State       | Behavior                                                         |
| ----------- | ---------------------------------------------------------------- |
| `CLOSED`    | Normal. Requests flow. Failures are counted in a sliding window. |
| `OPEN`      | Provider is down. Requests fail fast (no API call made).         |
| `HALF_OPEN` | Cooldown expired. One request allowed through as a probe.        |

### Transitions

- `CLOSED → OPEN`: 5 failures within a 60-second sliding window
- `OPEN → HALF_OPEN`: After 30-second cooldown
- `HALF_OPEN → CLOSED`: Probe request succeeds
- `HALF_OPEN → OPEN`: Probe request fails (reset cooldown)

### Configuration

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number; // default: 5
  failureWindowMs: number; // default: 60_000
  resetTimeoutMs: number; // default: 30_000
}
```

### Interface

```typescript
class CircuitBreaker {
  constructor(provider: string, config?: Partial<CircuitBreakerConfig>);

  // Wraps an async operation with circuit breaker logic
  async execute<T>(operation: () => Promise<T>): Promise<T>;

  // Current state for metrics/health endpoints
  getState(): "closed" | "open" | "half_open";
}
```

### Integration

Replaces the retry-then-mark-unhealthy logic in `ConnectionPoolService.executeWithRetry()`. The circuit breaker wraps the entire pool — if Anthropic is down, it doesn't matter which of the 5 pooled clients you try.

### Observability

- State transitions logged via structured logger + Sentry breadcrumb
- `/api/health` endpoint extended to report circuit states per provider
- `/api/connection-pool/health` updated to include circuit breaker metrics

---

## 2. LLM Provider Fallback

### Problem

Every Claude-backed service is hardcoded to Anthropic. When Anthropic is down, the entire product stops — no summaries, no task extraction, no chat.

### Design

New `ResilientModelProvider` in `src/server/services/resilient-model-provider.service.ts`. It sits between services and the connection pool, selecting the right provider based on circuit breaker state.

### Fallback Mapping

| Primary             | Fallback      | Rationale                  |
| ------------------- | ------------- | -------------------------- |
| `claude-sonnet-4-6` | `gpt-4o`      | Comparable capability tier |
| `claude-opus-4-6`   | `gpt-4o`      | Best available alternative |
| `claude-haiku-4-5`  | `gpt-4o-mini` | Cost-matched tier          |

### Flow

1. Service requests a model for a specific purpose (e.g. `"summary"`)
2. `ResilientModelProvider` checks the Anthropic circuit breaker
3. If **CLOSED** → returns Anthropic AI SDK model via connection pool
4. If **OPEN** → returns OpenAI AI SDK model via connection pool
5. If **HALF_OPEN** → tries Anthropic (probe), falls back to OpenAI on failure
6. Returns both the model instance and metadata: `{ model, provider, modelId, isFallback }`

### Why This Is Clean

Both `@ai-sdk/anthropic` and `@ai-sdk/openai` implement the same Vercel AI SDK `LanguageModel` interface. `generateText()`, `streamText()`, and the guardrails middleware (`wrapLanguageModel()`) all work identically regardless of provider. The swap is at the model selection layer, not in each service.

### Service Integration Pattern

```typescript
// Before (current):
connectionPool.withAnthropicAISdkClient(async (anthropic) => {
  const model = anthropic("claude-sonnet-4-6");
  return generateText({ model, ... });
});

// After:
const { model, isFallback } = await resilientModelProvider.getModel("summary");
return generateText({ model: createGuardedModel(model, opts), ... });
```

Each service passes its purpose key. The provider handles circuit checking, pool selection, and provenance logging internally.

### Services Affected (6 total)

| Service                                                  | Fallback behavior                                                                      |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `SummaryService`                                         | Silent fallback                                                                        |
| `TaskExtractionService`                                  | Silent fallback                                                                        |
| `TranscriptionService.correctTranscriptionWithKnowledge` | Silent fallback                                                                        |
| `AgendaTrackerService`                                   | Silent fallback                                                                        |
| `ConversationContextManager`                             | Silent fallback                                                                        |
| `ChatPipeline`                                           | Fallback + passes `isFallback` flag so frontend shows "Running on backup AI" indicator |

### Provenance

`ModelProvenanceService.logInvocation()` gets a new `isFallback: boolean` field so audit logs record when fallback was used.

### Edge Case — Both Providers Down

If both Anthropic and OpenAI circuits are open, the request fails immediately with a clear `SERVICE_UNAVAILABLE` error. No infinite fallback chain.

---

## 3. Deepgram Retry Queue

### Problem

When Deepgram fails and the 3 immediate retries (1s, 5s, 15s) are exhausted, the recording is marked "failed" permanently. The user's only option is manual reprocessing. But Deepgram outages are typically transient — 10 minutes later it's fine.

### Design

Database-backed deferred retry using existing infrastructure (cron + DB status tracking). No new dependencies.

### Schema Changes — Extend `recordings` Table

```sql
transcription_retry_count    INTEGER    DEFAULT 0
transcription_next_retry_at  TIMESTAMP  NULL
transcription_last_error     TEXT       NULL
```

### New Transcription Status

Add `"queued_for_retry"` alongside existing `"processing"`, `"completed"`, `"failed"`.

### Flow on Deepgram Failure

```
Deepgram call fails
  → 3 immediate retries (existing, 1s/5s/15s)
  → All retries exhausted
  → retry_count < 5?
    YES → status = "queued_for_retry"
        → next_retry_at = now + backoff[retry_count]
        → notify user: "Transcription temporarily delayed, will retry automatically"
    NO  → status = "failed" (permanent)
        → notify user: "Transcription could not be completed after multiple attempts"
```

### Backoff Schedule

| Attempt | Delay    | Cumulative wait |
| ------- | -------- | --------------- |
| 1       | 5 min    | 5 min           |
| 2       | 15 min   | 20 min          |
| 3       | 1 hour   | 1h 20min        |
| 4       | 4 hours  | 5h 20min        |
| 5       | 12 hours | 17h 20min       |

### New Cron Job: `/api/cron/retry-failed-transcriptions`

- Runs every 5 minutes
- First checks Deepgram circuit breaker — if OPEN, skips the run entirely (no point retrying a dead provider)
- Queries: `WHERE transcription_status = 'queued_for_retry' AND next_retry_at <= NOW()`
- Processes up to 10 recordings per run (prevents timeout)
- For each: re-invokes the `convertRecordingIntoAiInsights` workflow
- On success: status → "completed", user notified
- On failure: increment retry_count, calculate next backoff, or mark permanently failed
- Sentry instrumented (follows existing cron pattern with `CRON_SECRET` auth)

### User-Facing Changes

- Recording detail page shows "Queued for retry" status with estimated next attempt time
- New notification type: `"transcription_queued"` — "Transcription temporarily delayed, will retry automatically"
- Existing `"transcription_failed"` updated to only fire on permanent failure (after 5 deferred attempts)

### Why DB-Backed

Survives deployments/restarts. Visible for debugging. Uses existing cron infrastructure. No Redis queue or new dependency needed.

---

## Architecture Diagram

```
┌─────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Services   │────▶│ ResilientModelProvider│────▶│ ConnectionPool   │
│ (Summary,   │     │                     │     │ (OpenAI pool,    │
│  Tasks,     │     │ ┌─────────────────┐ │     │  Anthropic pool) │
│  Chat, ...) │     │ │ Circuit Breaker │ │     └──────────────────┘
└─────────────┘     │ │ per provider    │ │
                    │ └─────────────────┘ │
                    │                     │
                    │ Fallback mapping:   │
                    │ Claude → GPT-4o     │
                    └─────────────────────┘

┌─────────────┐     ┌─────────────────┐     ┌──────────────────────┐
│ Transcription│────▶│ Circuit Breaker │────▶│ Deepgram API         │
│ Service     │     │ (deepgram)      │     └──────────────────────┘
└──────┬──────┘     └─────────────────┘
       │ on failure (retries exhausted)
       ▼
┌──────────────────┐     ┌──────────────────────────────┐
│ recordings table │◀────│ /api/cron/retry-failed-       │
│ status:          │     │  transcriptions (every 5min)  │
│ queued_for_retry │     └──────────────────────────────┘
└──────────────────┘
```

---

## Files to Create

| File                                                      | Purpose                                           |
| --------------------------------------------------------- | ------------------------------------------------- |
| `src/server/services/circuit-breaker.service.ts`          | Circuit breaker with open/half-open/closed states |
| `src/server/services/resilient-model-provider.service.ts` | LLM fallback orchestration                        |
| `src/app/api/cron/retry-failed-transcriptions/route.ts`   | Cron job for deferred Deepgram retries            |

## Files to Modify

| File                                                          | Change                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------ |
| `src/server/services/connection-pool.service.ts`              | Integrate circuit breakers, remove primitive health tracking |
| `src/server/services/summary.service.ts`                      | Use `ResilientModelProvider` instead of direct pool access   |
| `src/server/services/transcription.service.ts`                | Queue for retry on Deepgram failure                          |
| `src/server/services/task-extraction.service.ts`              | Use `ResilientModelProvider`                                 |
| `src/server/services/chat/chat-pipeline.service.ts`           | Use `ResilientModelProvider`, pass `isFallback` to frontend  |
| `src/server/services/model-provenance.service.ts`             | Add `isFallback` field to `ProvenanceRecord`                 |
| `src/server/services/notification.service.ts`                 | Add `transcription_queued` notification type                 |
| `src/server/db/schema/recordings.ts`                          | Add retry columns                                            |
| `src/server/db/schema/notifications.ts`                       | Add `transcription_queued` type                              |
| `src/workflows/convert-recording/steps/step-transcription.ts` | Trigger queue-for-retry on exhausted retries                 |
| `src/app/api/health/route.ts`                                 | Report circuit breaker states                                |
