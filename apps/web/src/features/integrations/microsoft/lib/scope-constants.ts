/**
 * Granular scope tiers for incremental Microsoft OAuth authorization.
 * Only the "base" tier is requested on initial connection; additional
 * tiers are requested just-in-time when the user activates a feature.
 *
 * NOTE: `offline_access` is intentionally excluded from these tiers.
 * Microsoft never returns it in the token response `scope` field (it
 * silently grants a refresh token instead), so including it here would
 * cause scope-checks to always fail. It is added separately when
 * building the authorization URL.
 *
 * This file is intentionally free of Node.js dependencies so it can be
 * safely imported by client components.
 */
export const MS_SCOPE_TIERS = {
  base: ["User.Read", "Calendars.Read"],
  calendarWrite: ["Calendars.ReadWrite", "OnlineMeetings.ReadWrite"],
  mail: ["Mail.ReadWrite"],
  onedrive: ["Files.Read.All"],
} as const;

export type MsScopeTier = keyof typeof MS_SCOPE_TIERS;
export type MsScope = (typeof MS_SCOPE_TIERS)[MsScopeTier][number];
