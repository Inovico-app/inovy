/**
 * Granular scope tiers for incremental Google OAuth authorization.
 * Only the "base" tier is requested on initial connection; additional
 * tiers are requested just-in-time when the user activates a feature.
 *
 * This file is intentionally free of Node.js dependencies so it can be
 * safely imported by client components.
 */
export const SCOPE_TIERS = {
  base: [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/calendar.readonly",
  ],
  calendarWrite: ["https://www.googleapis.com/auth/calendar.events"],
  gmail: ["https://www.googleapis.com/auth/gmail.compose"],
  drive: ["https://www.googleapis.com/auth/drive.readonly"],
} as const;

export type ScopeTier = keyof typeof SCOPE_TIERS;

export type GoogleScope = (typeof SCOPE_TIERS)[ScopeTier][number];

