import {
  MS_SCOPE_TIERS,
  type MsScope,
  type MsScopeTier,
} from "./scope-constants";

/**
 * Check whether the user's granted scopes satisfy a given tier.
 */
export function hasRequiredMsScopes(
  userScopes: string[],
  tier: MsScopeTier,
): boolean {
  const required = MS_SCOPE_TIERS[tier];
  const granted = new Set(userScopes);
  return required.every((s) => granted.has(s));
}

/**
 * Return the scopes from a tier that the user has NOT yet granted.
 */
export function getMissingMsScopes(
  userScopes: string[],
  tier: MsScopeTier,
): string[] {
  const granted = new Set(userScopes);
  return MS_SCOPE_TIERS[tier].filter((s) => !granted.has(s));
}

/**
 * Merge new scopes with the user's existing scopes, deduplicating.
 */
export function mergeWithExistingScopes(
  existingScopes: string[],
  newScopes: readonly string[],
): string[] {
  const merged = new Set([...existingScopes, ...newScopes]);
  return Array.from(merged);
}

/**
 * Build the URL that kicks off an incremental OAuth request for a specific tier.
 * @param tier - The scope tier to request
 * @param redirectUrl - Where to redirect after the OAuth callback completes
 */
export function getIncrementalAuthUrl(
  tier: MsScopeTier,
  redirectUrl: string,
): string {
  const params = new URLSearchParams({
    tier,
    redirect: redirectUrl,
  });
  return `/api/integrations/microsoft/authorize?${params.toString()}`;
}

const TIER_LABELS = {
  base: "Calendar (read-only)",
  calendarWrite: "Calendar (create & edit events) + Teams meetings",
  mail: "Outlook Mail (create drafts)",
  onedrive: "OneDrive (read files)",
} satisfies Record<MsScopeTier, string>;

/**
 * Get a human-readable label for a scope tier.
 */
export function msTierToLabel(tier: MsScopeTier): string {
  return TIER_LABELS[tier];
}

const TIER_DESCRIPTIONS = {
  base: "View your Outlook calendars and upcoming events",
  calendarWrite:
    "Create and edit calendar events, and create Teams meeting links",
  mail: "Create email drafts from meeting summaries",
  onedrive: "Watch OneDrive folders for audio/video recordings",
} satisfies Record<MsScopeTier, string>;

/**
 * Get a user-facing explanation of why a scope tier is needed.
 */
export function msTierToDescription(tier: MsScopeTier): string {
  return TIER_DESCRIPTIONS[tier];
}

const HUMAN_LABELS = {
  "User.Read": "View your Microsoft account profile",
  "Calendars.Read": "View your Outlook calendar events",
  offline_access: "Maintain access while you're not using the app",
  "Calendars.ReadWrite": "Create and edit calendar events",
  "OnlineMeetings.ReadWrite": "Create and manage Teams meeting links",
  "Mail.ReadWrite": "Create email drafts in Outlook",
  "Files.Read.All": "Read files and folders in OneDrive",
} satisfies Record<MsScope, string>;

/**
 * Convert a raw Microsoft scope string to a human-readable label.
 */
export function msScopeToLabel(scope: string): string {
  return (HUMAN_LABELS as Record<string, string>)[scope] ?? scope;
}
