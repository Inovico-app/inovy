/**
 * Generic scope-checking utilities shared across OAuth providers.
 *
 * Each provider re-exports thin wrappers that bind the provider-specific
 * scope-tier map, keeping call-sites simple while avoiding duplicated logic.
 *
 * This file is intentionally free of Node.js dependencies so it can be
 * safely imported by client components.
 */

/**
 * Check whether the user's granted scopes satisfy every scope in the given tier.
 */
export function hasRequiredScopes<T extends Record<string, readonly string[]>>(
  userScopes: string[],
  tiers: T,
  tier: keyof T,
): boolean {
  const required = tiers[tier];
  const granted = new Set(userScopes);
  return required.every((s) => granted.has(s));
}

/**
 * Return the scopes from a tier that the user has NOT yet granted.
 */
export function getMissingScopes<T extends Record<string, readonly string[]>>(
  userScopes: string[],
  tiers: T,
  tier: keyof T,
): string[] {
  const required = tiers[tier];
  const granted = new Set(userScopes);
  return required.filter((s) => !granted.has(s));
}
