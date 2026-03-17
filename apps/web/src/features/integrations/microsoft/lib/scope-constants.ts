/**
 * Granular scope tiers for incremental Microsoft OAuth authorization.
 * Only the "base" tier is requested on initial connection; additional
 * tiers are requested just-in-time when the user activates a feature.
 *
 * This file is intentionally free of Node.js dependencies so it can be
 * safely imported by client components.
 */
export const MS_SCOPE_TIERS = {
  base: ["User.Read", "Calendars.Read", "offline_access"],
  calendarWrite: ["Calendars.ReadWrite", "OnlineMeetings.ReadWrite"],
  mail: ["Mail.ReadWrite"],
  onedrive: ["Files.Read.All"],
} as const;

export type MsScopeTier = keyof typeof MS_SCOPE_TIERS;
export type MsScope = (typeof MS_SCOPE_TIERS)[MsScopeTier][number];
