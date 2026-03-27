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
