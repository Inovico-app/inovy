import { SCOPE_TIERS, type ScopeTier } from "./scope-constants";

/**
 * Check whether the user's granted scopes satisfy a given tier.
 */
export function hasRequiredScopes(
  userScopes: string[],
  tier: ScopeTier
): boolean {
  const required = SCOPE_TIERS[tier];
  const granted = new Set(userScopes);
  return required.every((s) => granted.has(s));
}

/**
 * Return the scopes from a tier that the user has NOT yet granted.
 */
export function getMissingScopes(
  userScopes: string[],
  tier: ScopeTier
): string[] {
  const granted = new Set(userScopes);
  return SCOPE_TIERS[tier].filter((s) => !granted.has(s));
}

/**
 * Build the URL that kicks off an incremental OAuth request for a specific tier.
 * @param tier - The scope tier to request
 * @param redirectUrl - Where to redirect after the OAuth callback completes
 */
export function getIncrementalAuthUrl(
  tier: ScopeTier,
  redirectUrl: string
): string {
  const params = new URLSearchParams({
    scopes: tier,
    redirect: redirectUrl,
  });
  return `/api/integrations/google/authorize?${params.toString()}`;
}

const HUMAN_LABELS: Record<string, string> = {
  "https://www.googleapis.com/auth/userinfo.email": "View your email address",
  "https://www.googleapis.com/auth/calendar.readonly":
    "View your calendar events",
  "https://www.googleapis.com/auth/calendar.events":
    "Create and edit calendar events",
  "https://www.googleapis.com/auth/gmail.compose": "Create Gmail drafts",
  "https://www.googleapis.com/auth/drive.readonly":
    "Read Google Drive files and folders",
};

/**
 * Convert a raw Google scope URL to a human-readable label.
 */
export function scopeToLabel(scope: string): string {
  return HUMAN_LABELS[scope] ?? scope;
}

const TIER_LABELS: Record<ScopeTier, string> = {
  base: "Calendar (read-only)",
  calendarWrite: "Calendar (create & edit events)",
  gmail: "Gmail (create drafts)",
  drive: "Google Drive (read files)",
};

/**
 * Get a human-readable label for a scope tier.
 */
export function tierToLabel(tier: ScopeTier): string {
  return TIER_LABELS[tier];
}

const TIER_DESCRIPTIONS: Record<ScopeTier, string> = {
  base: "View your upcoming meetings so Inovy can record and process them.",
  calendarWrite:
    "Create and update calendar events directly from extracted tasks and action items.",
  gmail:
    "Generate follow-up email drafts from meeting summaries — nothing is sent without your explicit approval.",
  drive:
    "Watch shared Drive folders for new recordings to process automatically.",
};

/**
 * Get a user-facing explanation of why a scope tier is needed.
 */
export function tierToDescription(tier: ScopeTier): string {
  return TIER_DESCRIPTIONS[tier];
}

