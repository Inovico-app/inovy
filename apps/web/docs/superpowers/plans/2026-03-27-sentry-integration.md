# Sentry Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Sentry error monitoring into the Inovy web app — tune the wizard-generated config, capture errors at critical paths (webhooks, crons, workflow), and create alert rules.

**Architecture:** The Sentry wizard already scaffolded base config files and wrapped `next.config.ts` with `withSentryConfig`. This plan tunes those configs for production, disables PII, and adds `Sentry.captureException()` with rich non-PII context at every critical failure point. `after()` from `next/server` makes captures non-blocking in route handlers.

**Tech Stack:** `@sentry/nextjs` (already installed), Next.js 16.2.1, TypeScript, Sentry REST API (for alert rules)

**Spec:** `docs/superpowers/specs/2026-03-27-sentry-integration-design.md`

---

## File Structure

| File                                            | Action | Purpose                                  |
| ----------------------------------------------- | ------ | ---------------------------------------- |
| `.env.local`                                    | Modify | Add `NEXT_PUBLIC_SENTRY_DSN`             |
| `sentry.server.config.ts`                       | Modify | Production tuning, PII off, spotlight    |
| `sentry.edge.config.ts`                         | Modify | Production tuning, PII off, DSN from env |
| `src/instrumentation-client.ts`                 | Modify | Production tuning, replay integration    |
| `src/app/global-error.tsx`                      | Modify | Add Sentry capture                       |
| `src/app/(main)/error.tsx`                      | Modify | Add Sentry capture                       |
| `src/app/(main)/chat/error.tsx`                 | Modify | Add Sentry capture                       |
| `src/app/(main)/record/error.tsx`               | Modify | Add Sentry capture                       |
| `src/app/api/webhooks/recall/route.ts`          | Modify | Add Sentry capture with bot context      |
| `src/app/api/webhooks/google-drive/route.ts`    | Modify | Add Sentry capture with drive context    |
| `src/app/api/cron/poll-bot-status/route.ts`     | Modify | Add Sentry capture                       |
| `src/app/api/cron/monitor-calendar/route.ts`    | Modify | Add Sentry capture                       |
| `src/app/api/cron/agenda-check/route.ts`        | Modify | Add Sentry capture                       |
| `src/app/api/cron/data-retention/route.ts`      | Modify | Add Sentry capture                       |
| `src/app/api/cron/backup-verification/route.ts` | Modify | Add Sentry capture                       |
| `src/app/api/cron/backfill-series/route.ts`     | Modify | Add Sentry capture                       |
| `src/app/api/cron/renew-drive-watches/route.ts` | Modify | Add Sentry capture                       |
| `src/workflows/convert-recording/index.ts`      | Modify | Add Sentry capture with workflow context |
| `scripts/sentry-setup-alerts.ts`                | Create | Alert rules setup via Sentry API         |

---

### Task 1: Environment Setup

**Files:**

- Modify: `.env.local`

- [ ] **Step 1: Add NEXT_PUBLIC_SENTRY_DSN to .env.local**

Add at the end of `.env.local`:

```bash
# Sentry
NEXT_PUBLIC_SENTRY_DSN="https://bc4b94066216dfde083a1b573f70e4e1@o4511116441616384.ingest.de.sentry.io/4511116443582544"
```

- [ ] **Step 2: Commit**

```bash
git add .env.local
git commit -m "chore: add NEXT_PUBLIC_SENTRY_DSN env var"
```

> **Note:** Also add `NEXT_PUBLIC_SENTRY_DSN` to Vercel environment variables via the Vercel dashboard. The Vercel Sentry integration may have already done this.

---

### Task 2: Tune Sentry Server Config

**Files:**

- Modify: `sentry.server.config.ts`

- [ ] **Step 1: Replace entire file content**

```typescript
// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  enableLogs: true,
  sendDefaultPii: false,

  // Sentry Spotlight for local dev debugging
  spotlight: process.env.NODE_ENV === "development",

  ignoreErrors: [
    "ResizeObserver loop",
    "ResizeObserver loop completed with undelivered notifications",
    "Failed to fetch",
    "Load failed",
    "NetworkError",
    "AbortError",
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
  ],
});
```

- [ ] **Step 2: Commit**

```bash
git add sentry.server.config.ts
git commit -m "feat(sentry): tune server config — PII off, prod sample rates, spotlight"
```

---

### Task 3: Tune Sentry Edge Config

**Files:**

- Modify: `sentry.edge.config.ts`

- [ ] **Step 1: Replace entire file content**

```typescript
// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  enableLogs: true,
  sendDefaultPii: false,

  ignoreErrors: [
    "ResizeObserver loop",
    "ResizeObserver loop completed with undelivered notifications",
    "Failed to fetch",
    "Load failed",
    "NetworkError",
    "AbortError",
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
  ],
});
```

- [ ] **Step 2: Commit**

```bash
git add sentry.edge.config.ts
git commit -m "feat(sentry): tune edge config — DSN from env, PII off, prod sample rates"
```

---

### Task 4: Tune Sentry Client Config

**Files:**

- Modify: `src/instrumentation-client.ts`

- [ ] **Step 1: Replace entire file content**

```typescript
// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  enableLogs: true,
  sendDefaultPii: false,

  // Session Replay: 10% of sessions, 100% of error sessions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],

  ignoreErrors: [
    "ResizeObserver loop",
    "ResizeObserver loop completed with undelivered notifications",
    "Failed to fetch",
    "Load failed",
    "NetworkError",
    "AbortError",
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
```

- [ ] **Step 2: Commit**

```bash
git add src/instrumentation-client.ts
git commit -m "feat(sentry): tune client config — replay, PII off, prod sample rates"
```

---

### Task 5: Wire Sentry Into Error Boundaries

**Files:**

- Modify: `src/app/global-error.tsx`
- Modify: `src/app/(main)/error.tsx`
- Modify: `src/app/(main)/chat/error.tsx`
- Modify: `src/app/(main)/record/error.tsx`

- [ ] **Step 1: Update global-error.tsx**

Add Sentry import and captureException in the useEffect:

```typescript
"use client";

import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    logger.error("Global error occurred", {
      component: "GlobalError",
      error: error instanceof Error ? error : new Error(String(error)),
      digest: error.digest,
    });
    Sentry.captureException(error, {
      tags: { boundary: "global" },
      contexts: { error_info: { digest: error.digest } },
    });
  }, [error]);

  return (
    <html lang="nl" suppressHydrationWarning>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background">
          <div className="text-center space-y-4 max-w-md">
            <div className="flex justify-center">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertTriangle
                  className="h-8 w-8 text-destructive"
                  aria-hidden="true"
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-destructive">
              Something went wrong
            </h1>
            <p className="text-muted-foreground">
              A critical error occurred. Please try refreshing the page or
              contact support if the problem persists.
            </p>
            {process.env.NODE_ENV === "development" && error.message && (
              <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                {error.message}
              </p>
            )}
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={reset}>
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update (main)/error.tsx**

Add Sentry import and captureException in the useEffect:

```typescript
"use client";

import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    logger.error("Dashboard page error occurred", {
      component: "DashboardError",
      error: error instanceof Error ? error : new Error(String(error)),
      digest: error.digest,
    });
    Sentry.captureException(error, {
      tags: { boundary: "dashboard" },
      contexts: { error_info: { digest: error.digest } },
    });
  }, [error]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-3 bg-destructive/10 rounded-full">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-destructive">
          Unable to Load Dashboard
        </h1>
        <p className="text-muted-foreground max-w-md">
          We encountered an error loading your dashboard. Please try refreshing
          the page or contact support if the problem persists.
        </p>
        {process.env.NODE_ENV === "development" && error.message && (
          <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded max-w-2xl">
            {error.message}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={reset}>
            Try Again
          </Button>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update (main)/chat/error.tsx**

Add Sentry import and captureException in the useEffect:

```typescript
"use client";

import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

interface ChatErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ChatError({ error, reset }: ChatErrorProps) {
  const t = useTranslations("chat");

  useEffect(() => {
    logger.error("Chat page error occurred", {
      component: "ChatError",
      error: error instanceof Error ? error : new Error(String(error)),
      digest: error.digest,
    });
    Sentry.captureException(error, {
      tags: { boundary: "chat" },
      contexts: { error_info: { digest: error.digest } },
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100dvh-4rem)] p-8">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <div className="p-3 bg-destructive/10 rounded-full">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-destructive">
          {t("errorTitle")}
        </h2>
        <p className="text-muted-foreground">{t("errorDescription")}</p>
        {process.env.NODE_ENV === "development" && error.message && (
          <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
            {error.message}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={reset}>
            {t("tryAgain")}
          </Button>
          <Button onClick={() => window.location.reload()}>
            {t("refreshPage")}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update (main)/record/error.tsx**

Add Sentry import and captureException in the useEffect:

```typescript
"use client";

import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

interface RecordErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RecordError({ error, reset }: RecordErrorProps) {
  const t = useTranslations("recordings");

  useEffect(() => {
    logger.error("Record page error occurred", {
      component: "RecordError",
      error: error instanceof Error ? error : new Error(String(error)),
      digest: error.digest,
    });
    Sentry.captureException(error, {
      tags: { boundary: "record" },
      contexts: { error_info: { digest: error.digest } },
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <div className="p-3 bg-destructive/10 rounded-full">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-destructive">
          {t("error.recordingError")}
        </h2>
        <p className="text-muted-foreground">
          {t("error.recordingErrorDescription")}
        </p>
        {process.env.NODE_ENV === "development" && error.message && (
          <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
            {error.message}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={reset}>
            {t("error.tryAgain")}
          </Button>
          <Button onClick={() => window.location.reload()}>
            {t("error.refreshPage")}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/global-error.tsx src/app/\(main\)/error.tsx src/app/\(main\)/chat/error.tsx src/app/\(main\)/record/error.tsx
git commit -m "feat(sentry): wire captureException into all 4 error boundaries"
```

---

### Task 6: Instrument Recall Webhook

**Files:**

- Modify: `src/app/api/webhooks/recall/route.ts`

- [ ] **Step 1: Add Sentry imports and capture at all error points**

Add these imports at the top of the file:

```typescript
import * as Sentry from "@sentry/nextjs";
import { after } from "next/server";
```

Then add Sentry capture at 4 error points in the existing code. The key changes are:

**After the `result.isErr()` check (around line 121-126):**

Replace:

```typescript
if (result.isErr()) {
  logger.error("Failed to process webhook event", {
    component: "POST /api/webhooks/recall",
    error: result.error,
    event: eventType,
  });
  return okResponse({ success: false, error: "Processing failed" });
}
```

With:

```typescript
if (result.isErr()) {
  logger.error("Failed to process webhook event", {
    component: "POST /api/webhooks/recall",
    error: result.error,
    event: eventType,
  });
  after(() => {
    Sentry.withScope((scope) => {
      scope.setTags({ component: "recall-webhook", event_type: eventType });
      scope.setContext("bot", { bot_id: botId });
      scope.setContext("error_detail", {
        error_code: result.error.code,
        error_message: result.error.message,
      });
      Sentry.captureException(
        new Error(`Recall webhook processing failed: ${result.error.message}`),
      );
    });
  });
  return okResponse({ success: false, error: "Processing failed" });
}
```

**In the outer catch block (around line 130-135):**

Replace:

```typescript
  } catch (error) {
    logger.error("Error in Recall.ai webhook handler", {
      component: "POST /api/webhooks/recall",
      error: serializeError(error),
    });
    return okResponse({ success: false, error: "Internal error" });
  }
```

With:

```typescript
  } catch (error) {
    logger.error("Error in Recall.ai webhook handler", {
      component: "POST /api/webhooks/recall",
      error: serializeError(error),
    });
    after(() => {
      Sentry.withScope((scope) => {
        scope.setTags({ component: "recall-webhook" });
        Sentry.captureException(error);
      });
    });
    return okResponse({ success: false, error: "Internal error" });
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/webhooks/recall/route.ts
git commit -m "feat(sentry): instrument Recall webhook with error capture and bot context"
```

---

### Task 7: Instrument Google Drive Webhook

**Files:**

- Modify: `src/app/api/webhooks/google-drive/route.ts`

- [ ] **Step 1: Add Sentry imports**

Add at the top of the file:

```typescript
import * as Sentry from "@sentry/nextjs";
```

- [ ] **Step 2: Add Sentry capture in processChangeNotification error handlers**

In the `processChangeNotification` function, add Sentry capture at the 3 error points.

**After `filesResult.isErr()` check (around line 137-145):**

Add after the existing `logger.error(...)`:

```typescript
Sentry.withScope((scope) => {
  scope.setTags({
    component: "google-drive-webhook",
    operation: "fetch-files",
  });
  scope.setContext("drive", {
    folder_id: watch.folderId,
    channel_id: channelId,
    watch_id: watch.id,
    org_id: watch.organizationId,
  });
  Sentry.captureException(
    new Error(`Failed to fetch files from Drive folder: ${filesResult.error}`),
  );
});
```

**After `processResult.isErr()` check (around line 195-206):**

Add after the existing `logger.error(...)`:

```typescript
Sentry.withScope((scope) => {
  scope.setTags({
    component: "google-drive-webhook",
    operation: "process-upload",
  });
  scope.setContext("drive", {
    folder_id: watch.folderId,
    channel_id: channelId,
    watch_id: watch.id,
    org_id: watch.organizationId,
    file_count: recentFiles.length,
  });
  scope.setContext("error_detail", {
    error_code: processResult.error.code,
    error_message: processResult.error.message,
  });
  Sentry.captureException(
    new Error(`Failed to process file uploads: ${processResult.error.message}`),
  );
});
```

**In the final catch block of processChangeNotification (around line 215-224):**

Add after the existing `logger.error(...)`:

```typescript
Sentry.withScope((scope) => {
  scope.setTags({
    component: "google-drive-webhook",
    operation: "change-notification",
  });
  scope.setContext("drive", { channel_id: channelId });
  Sentry.captureException(error);
});
```

- [ ] **Step 3: Add Sentry capture in main POST catch block (around line 86-92)**

Replace:

```typescript
  } catch (error) {
    // Always return 200 to avoid Google retries
    logger.error(
      "Error in Google Drive webhook handler",
      {},
      error as Error
    );
    return NextResponse.json({ success: true });
  }
```

With:

```typescript
  } catch (error) {
    logger.error(
      "Error in Google Drive webhook handler",
      {},
      error as Error,
    );
    Sentry.withScope((scope) => {
      scope.setTags({ component: "google-drive-webhook" });
      Sentry.captureException(error);
    });
    return NextResponse.json({ success: true });
  }
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/webhooks/google-drive/route.ts
git commit -m "feat(sentry): instrument Google Drive webhook with error capture and drive context"
```

---

### Task 8: Instrument Cron Jobs

**Files:**

- Modify: `src/app/api/cron/poll-bot-status/route.ts`
- Modify: `src/app/api/cron/monitor-calendar/route.ts`
- Modify: `src/app/api/cron/agenda-check/route.ts`
- Modify: `src/app/api/cron/data-retention/route.ts`
- Modify: `src/app/api/cron/backup-verification/route.ts`
- Modify: `src/app/api/cron/backfill-series/route.ts`
- Modify: `src/app/api/cron/renew-drive-watches/route.ts`

For each cron route: add `import * as Sentry from "@sentry/nextjs"` and `import { after } from "next/server"` at the top, then add Sentry capture in the catch block(s).

- [ ] **Step 1: Instrument poll-bot-status**

Add imports at top:

```typescript
import * as Sentry from "@sentry/nextjs";
import { after } from "next/server";
```

In the `result.isErr()` block (around line 38-49), add after the `logger.error(...)`:

```typescript
after(() => {
  Sentry.withScope((scope) => {
    scope.setTags({ component: "cron-poll-bot-status" });
    scope.setContext("cron", {
      cron_job: "poll-bot-status",
      error_message: result.error.message,
    });
    Sentry.captureException(
      new Error(`Cron poll-bot-status failed: ${result.error.message}`),
    );
  });
});
```

In the outer catch block (around line 60-87), replace the entire block with:

```typescript
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof Error) {
      logger.error(
        "Error in bot status polling cron job",
        {
          component: "GET /api/cron/poll-bot-status",
          durationMs: duration,
          errorMessage: error.message,
          errorStack: error.stack,
        },
        error,
      );
    } else {
      logger.error("Error in bot status polling cron job", {
        component: "GET /api/cron/poll-bot-status",
        durationMs: duration,
        error: typeof error === "string" ? error : JSON.stringify(error),
      });
    }

    after(() => {
      Sentry.withScope((scope) => {
        scope.setTags({ component: "cron-poll-bot-status" });
        scope.setContext("cron", {
          cron_job: "poll-bot-status",
          duration_ms: duration,
        });
        Sentry.captureException(error);
      });
    });

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        durationMs: duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
```

- [ ] **Step 2: Instrument monitor-calendar**

Add imports at top:

```typescript
import * as Sentry from "@sentry/nextjs";
import { after } from "next/server";
```

In the `result.isErr()` block (around line 36-45), add after the `logger.error(...)`:

```typescript
after(() => {
  Sentry.withScope((scope) => {
    scope.setTags({ component: "cron-monitor-calendar" });
    scope.setContext("cron", {
      cron_job: "monitor-calendar",
      error_message: result.error.message,
    });
    Sentry.captureException(
      new Error(`Cron monitor-calendar failed: ${result.error.message}`),
    );
  });
});
```

In the outer catch block (around line 53-70), add before the `return`:

```typescript
after(() => {
  Sentry.withScope((scope) => {
    scope.setTags({ component: "cron-monitor-calendar" });
    scope.setContext("cron", {
      cron_job: "monitor-calendar",
      duration_ms: duration,
    });
    Sentry.captureException(error);
  });
});
```

- [ ] **Step 3: Instrument agenda-check**

Add imports at top:

```typescript
import * as Sentry from "@sentry/nextjs";
import { after } from "next/server";
```

In the outer catch block (around line 56-70), add before the `return`:

```typescript
after(() => {
  Sentry.withScope((scope) => {
    scope.setTags({ component: "cron-agenda-check" });
    scope.setContext("cron", {
      cron_job: "agenda-check",
      duration_ms: duration,
    });
    Sentry.captureException(error);
  });
});
```

- [ ] **Step 4: Instrument data-retention**

Add import at top:

```typescript
import * as Sentry from "@sentry/nextjs";
```

In the catch block (around line 57-66), add after the `logger.error(...)`:

```typescript
Sentry.withScope((scope) => {
  scope.setTags({ component: "cron-data-retention" });
  scope.setContext("cron", { cron_job: "data-retention" });
  Sentry.captureException(error);
});
```

> Note: `data-retention` does not track `startTime`/duration, so no `after()` import needed. Sentry capture is synchronous here since there's no timing context to pass.

- [ ] **Step 5: Instrument backup-verification**

Add import at top:

```typescript
import * as Sentry from "@sentry/nextjs";
```

In the catch block (around line 94-102), add after the `logger.error(...)`:

```typescript
Sentry.withScope((scope) => {
  scope.setTags({ component: "cron-backup-verification" });
  scope.setContext("cron", { cron_job: "backup-verification" });
  Sentry.captureException(error);
});
```

- [ ] **Step 6: Instrument backfill-series**

Add imports at top:

```typescript
import * as Sentry from "@sentry/nextjs";
import { after } from "next/server";
```

In the outer catch block (around line 60-74), add before the `return`:

```typescript
after(() => {
  Sentry.withScope((scope) => {
    scope.setTags({ component: "cron-backfill-series" });
    scope.setContext("cron", {
      cron_job: "backfill-series",
      duration_ms: duration,
    });
    Sentry.captureException(error);
  });
});
```

- [ ] **Step 7: Instrument renew-drive-watches**

Add import at top:

```typescript
import * as Sentry from "@sentry/nextjs";
```

In the outer catch block (around line 90-96), add after the `logger.error(...)`:

```typescript
Sentry.withScope((scope) => {
  scope.setTags({ component: "cron-renew-drive-watches" });
  scope.setContext("cron", { cron_job: "renew-drive-watches" });
  Sentry.captureException(error);
});
```

In the per-watch catch block (around line 74-81), add after the `logger.error(...)`:

```typescript
Sentry.withScope((scope) => {
  scope.setTags({ component: "cron-renew-drive-watches" });
  scope.setContext("watch", {
    watch_id: watch.id,
    folder_id: watch.folderId,
  });
  Sentry.captureException(error);
});
```

- [ ] **Step 8: Commit all cron changes**

```bash
git add src/app/api/cron/
git commit -m "feat(sentry): instrument all 7 cron jobs with error capture and context"
```

---

### Task 9: Instrument Workflow Pipeline

**Files:**

- Modify: `src/workflows/convert-recording/index.ts`

- [ ] **Step 1: Add Sentry import**

Add at the top of the file:

```typescript
import * as Sentry from "@sentry/nextjs";
```

- [ ] **Step 2: Add Sentry capture in the catch block**

Replace the catch block (around line 138-145):

```typescript
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown workflow error";

    logger.error("Workflow: Fatal error", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      error,
    });

    await updateWorkflowStatus(recordingId, "failed", errorMsg);
    return failure(errorMsg);
  }
```

With:

```typescript
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg =
      error instanceof Error ? error.message : "Unknown workflow error";

    logger.error("Workflow: Fatal error", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      error,
    });

    Sentry.withScope((scope) => {
      scope.setTags({ component: "workflow", workflow: "convert-recording" });
      scope.setContext("recording", {
        recording_id: recordingId,
        is_reprocessing: isReprocessing,
        recall_bot_id: recallBotId,
      });
      scope.setContext("workflow", {
        status: "failed",
        total_duration_ms: duration,
        error_message: errorMsg,
      });
      Sentry.captureException(error);
    });

    await updateWorkflowStatus(recordingId, "failed", errorMsg);
    return failure(errorMsg);
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/workflows/convert-recording/index.ts
git commit -m "feat(sentry): instrument workflow pipeline with error capture and recording context"
```

---

### Task 10: Create Alert Rules Setup Script

**Files:**

- Create: `scripts/sentry-setup-alerts.ts`

- [ ] **Step 1: Create the script**

```typescript
/**
 * Sentry Alert Rules Setup Script
 *
 * Creates alert rules in Sentry for critical error monitoring.
 * Idempotent: checks for existing rules by name before creating.
 *
 * Prerequisites:
 *   SENTRY_AUTH_TOKEN — API token with project:write scope
 *
 * Usage:
 *   npx tsx scripts/sentry-setup-alerts.ts
 */

const SENTRY_ORG = "inovy";
const SENTRY_PROJECT = "sentry-inovy";
const SENTRY_API_BASE = "https://sentry.io/api/0";

interface AlertRule {
  name: string;
  conditions: Array<Record<string, unknown>>;
  filters: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  frequency: number;
}

const ALERT_RULES: AlertRule[] = [
  {
    name: "Bot failure rate >10/hr",
    conditions: [
      {
        id: "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
        value: 10,
        comparisonType: "count",
        interval: "1h",
      },
    ],
    filters: [
      {
        id: "sentry.rules.filters.tagged_event.TaggedEventFilter",
        key: "component",
        match: "eq",
        value: "recall-webhook",
      },
      {
        id: "sentry.rules.filters.level.LevelFilter",
        match: "eq",
        level: "40", // error
      },
    ],
    actions: [
      {
        id: "sentry.mail.actions.NotifyEmailAction",
        targetType: "IssueOwners",
        fallthroughType: "ActiveMembers",
      },
    ],
    frequency: 60, // minutes between alerts
  },
  {
    name: "Unhandled exception spike >20/hr",
    conditions: [
      {
        id: "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
        value: 20,
        comparisonType: "count",
        interval: "1h",
      },
    ],
    filters: [
      {
        id: "sentry.rules.filters.tagged_event.TaggedEventFilter",
        key: "handled",
        match: "eq",
        value: "no",
      },
    ],
    actions: [
      {
        id: "sentry.mail.actions.NotifyEmailAction",
        targetType: "IssueOwners",
        fallthroughType: "ActiveMembers",
      },
    ],
    frequency: 60,
  },
  {
    name: "Stripe webhook errors",
    conditions: [
      {
        id: "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
        value: 1,
        comparisonType: "count",
        interval: "1h",
      },
    ],
    filters: [
      {
        id: "sentry.rules.filters.tagged_event.TaggedEventFilter",
        key: "component",
        match: "eq",
        value: "stripe-webhook",
      },
      {
        id: "sentry.rules.filters.level.LevelFilter",
        match: "eq",
        level: "40",
      },
    ],
    actions: [
      {
        id: "sentry.mail.actions.NotifyEmailAction",
        targetType: "IssueOwners",
        fallthroughType: "ActiveMembers",
      },
    ],
    frequency: 60,
  },
];

async function getExistingRules(
  token: string,
): Promise<Array<{ name: string }>> {
  const response = await fetch(
    `${SENTRY_API_BASE}/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/rules/`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch existing rules: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<Array<{ name: string }>>;
}

async function createRule(token: string, rule: AlertRule): Promise<void> {
  const response = await fetch(
    `${SENTRY_API_BASE}/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/rules/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: rule.name,
        actionMatch: "all",
        filterMatch: "all",
        conditions: rule.conditions,
        filters: rule.filters,
        actions: rule.actions,
        frequency: rule.frequency,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to create rule "${rule.name}": ${response.status} ${body}`,
    );
  }
}

async function main() {
  const token = process.env.SENTRY_AUTH_TOKEN;

  if (!token) {
    console.error("SENTRY_AUTH_TOKEN environment variable is required");
    process.exit(1);
  }

  console.log(
    `Setting up Sentry alert rules for ${SENTRY_ORG}/${SENTRY_PROJECT}...\n`,
  );

  const existingRules = await getExistingRules(token);
  const existingNames = new Set(existingRules.map((r) => r.name));

  for (const rule of ALERT_RULES) {
    if (existingNames.has(rule.name)) {
      console.log(`SKIPPED: "${rule.name}" (already exists)`);
      continue;
    }

    await createRule(token, rule);
    console.log(`CREATED: "${rule.name}"`);
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add scripts/sentry-setup-alerts.ts
git commit -m "feat(sentry): add alert rules setup script for bot failures, unhandled spikes, Stripe errors"
```

---

### Task 11: Build Verification

- [ ] **Step 1: Run TypeScript type check**

Run: `pnpm tsc --noEmit`
Expected: No type errors

- [ ] **Step 2: Run linter**

Run: `pnpm lint`
Expected: No lint errors related to changed files

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: Build succeeds. Sentry source maps upload may show in CI output.

- [ ] **Step 4: Fix any issues found**

If any type/lint/build errors, fix them and commit:

```bash
git add -A
git commit -m "fix(sentry): address build/lint issues"
```
