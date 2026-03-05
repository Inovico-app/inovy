/**
 * Data Minimization Utilities
 * Implements SSD-4.4.01: Minimize protected data communication
 * 
 * This module provides utilities to filter sensitive data from API responses
 * based on user roles, ensuring only necessary data is transmitted.
 */

import type { BetterAuthUser } from "./auth";
import { isOrganizationAdmin } from "./rbac/rbac";

export type UserRole = BetterAuthUser["role"];

/**
 * Determine if a user should have access to full (non-redacted) transcriptions
 * Only organization admins (owner, admin, superadmin) should see full transcriptions
 */
export function canAccessFullTranscription(user: BetterAuthUser): boolean {
  return isOrganizationAdmin(user);
}

/**
 * Determine if a user should see email addresses of other users
 * Only organization admins should see email addresses
 */
export function canAccessUserEmails(
  user: BetterAuthUser,
  targetUserId?: string
): boolean {
  // Users can always see their own email
  if (targetUserId && user.id === targetUserId) {
    return true;
  }
  
  // Organization admins can see all emails
  return isOrganizationAdmin(user);
}

/**
 * Determine if a user should see full recording metadata
 * Organization admins and managers can see full metadata
 */
export function canAccessFullRecordingMetadata(user: BetterAuthUser): boolean {
  return isOrganizationAdmin(user) || user.role === "manager";
}

/**
 * Determine if a user should see sensitive fields in responses
 * Only organization admins should see sensitive operational data
 */
export function canAccessSensitiveFields(user: BetterAuthUser): boolean {
  return isOrganizationAdmin(user);
}

/**
 * Redact email address for display
 * Converts "john.doe@example.com" to "j***@example.com"
 */
export function redactEmail(email: string | null): string | null {
  if (!email) return null;
  
  const [local, domain] = email.split("@");
  if (!local || !domain) return null;
  
  const firstChar = local.charAt(0);
  return `${firstChar}***@${domain}`;
}

/**
 * Data minimization context for filtering responses
 */
export interface DataMinimizationContext {
  user: BetterAuthUser;
  targetUserId?: string;
}
