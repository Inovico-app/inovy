import "server-only";

/**
 * Main exports for server action utilities
 * Smart approach using neverthrow Result types throughout
 *
 * NOTE: This file is server-only. Client components should import directly from specific modules:
 * - For logger: import { logger } from "@/lib/logger"
 * - For action clients: import from "@/lib/action-client" (server actions only)
 * - For RBAC: import from "@/lib/rbac" (server components/actions only)
 */

// Smart action client exports (server-only)
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

// RBAC exports (server-only - constants and types are safe but functions require server context)
export {
  canAccessOrganizationChat,
  getUserPolicies,
  isOrganizationAdmin,
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

// Logger export (re-export from existing logger)
export { logger } from "./logger";

// Audio utilities
export { blobToFile, convertBlobToMp3 } from "./audio-utils";

// Vercel Blob client utilities
export {
  uploadRecordingToBlob,
  type UploadRecordingOptions,
} from "./vercel-blob";

