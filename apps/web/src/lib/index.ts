/**
 * Main exports for server action utilities
 * Smart approach using neverthrow Result types throughout
 */

// Smart action client exports (recommended approach)
export {
  authorizedActionClient,
  chainResults,
  combineResults,
  mapResult,
  publicActionClient,
  resultToActionResponse,
  safeAsync,
  safeSync,
  validateInput,
  type ActionContext,
  type ActionResult,
  type Metadata,
} from "./action-client";

// Error handling exports (smart approach)
export {
  ActionErrors,
  createActionError,
  type ActionError,
  type ErrorCode,
} from "./action-errors";

// Error message utilities
export { generateApplicationErrorMessage } from "./error-messages";

// RBAC exports
export {
  getUserPolicies,
  POLICIES,
  POLICY_KEYS,
  ROLES,
  userHasAnyRole,
  userHasRole,
  userIsAuthorized,
  type PolicyKey,
  type Role,
  type SessionWithRoles,
} from "./rbac";

// Auth exports (re-export from existing auth module)
export { getAuthSession, getUserSession, type AuthUser } from "./auth";

// Logger export (re-export from existing logger)
export { logger } from "./logger";

