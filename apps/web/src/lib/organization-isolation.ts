/**
 * Organization Isolation Utilities
 * Provides centralized helpers for enforcing organization-level data isolation
 * to prevent cross-organization data access
 */

import { eq } from "drizzle-orm";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { ActionError } from "./action-errors";
import { ActionErrors } from "./action-errors";
import { getAuthSession } from "./auth";
import type { BetterAuthOrganization } from "./better-auth-session";
import { logger } from "./logger";

/**
 * Assert that a resource belongs to the user's organization
 * Throws ActionError if there's a mismatch (returns 404 to prevent information leakage)
 *
 * @param resourceOrgId - Organization ID of the resource being accessed
 * @param userOrgId - Organization ID of the authenticated user
 * @param context - Context for logging (e.g., "TaskService.updateTask")
 * @throws ActionError with NOT_FOUND code if organizations don't match
 */
export function assertOrganizationAccess(
  resourceOrgId: string | null | undefined,
  userOrgId: string | null | undefined,
  context?: string
): void {
  if (!resourceOrgId || !userOrgId) {
    logger.security.organizationViolation({
      resourceOrgId: resourceOrgId ?? "null",
      userOrgId: userOrgId ?? "null",
      context: context ?? "unknown",
      reason: "Missing organization ID",
    });

    throw ActionErrors.notFound(
      "Resource not found",
      context ?? "assertOrganizationAccess"
    );
  }

  if (resourceOrgId !== userOrgId) {
    logger.security.organizationViolation({
      resourceOrgId,
      userOrgId,
      context: context ?? "unknown",
      reason: "Organization mismatch",
    });

    // Return 404 instead of 403 to prevent information leakage
    throw ActionErrors.notFound(
      "Resource not found",
      context ?? "assertOrganizationAccess"
    );
  }

  // Log successful access for audit trail
  logger.debug("Organization access validated", {
    organizationId: userOrgId,
    context,
  });
}

/**
 * Helper for Drizzle queries to filter by organization
 * Returns a Drizzle eq() condition for organizationId column
 *
 * @param organizationIdColumn - The Drizzle column reference (e.g., tasks.organizationId)
 * @param organizationId - The organization ID to filter by
 * @returns Drizzle eq() condition
 *
 * @example
 * ```typescript
 * const condition = filterByOrganization(tasks.organizationId, userOrgId);
 * const results = await db.select().from(tasks).where(condition);
 * ```
 */
export function filterByOrganization(
  organizationIdColumn: any,
  organizationId: string
) {
  return eq(organizationIdColumn, organizationId);
}

/**
 * Get organization from the current auth session
 * Returns Result type for proper error handling
 *
 * @returns Result containing the organization or an error
 */
export async function getOrganizationFromSession(): Promise<
  Result<BetterAuthOrganization, ActionError>
> {
  const authResult = await getAuthSession();

  if (authResult.isErr()) {
    return err(
      ActionErrors.internal(
        "Failed to get authentication session",
        new Error(authResult.error),
        "getOrganizationFromSession"
      )
    );
  }

  const { isAuthenticated, organization } = authResult.value;

  if (!isAuthenticated) {
    return err(
      ActionErrors.unauthenticated(
        "User is not authenticated",
        "getOrganizationFromSession"
      )
    );
  }

  if (!organization) {
    return err(
      ActionErrors.forbidden(
        "User does not belong to an organization",
        undefined,
        "getOrganizationFromSession"
      )
    );
  }

  return ok(organization);
}

/**
 * Verify that a resource belongs to the user's organization
 * This is a convenience function that combines resource lookup with organization validation
 *
 * @param resource - The resource object that has an organizationId property
 * @param userOrgId - Organization ID of the authenticated user
 * @param resourceType - Type of resource for error messages (e.g., "Task", "Project")
 * @param context - Context for logging
 * @returns Result indicating success or error
 */
export function verifyResourceOrganization<
  T extends { organizationId: string | null }
>(
  resource: T | null | undefined,
  userOrgId: string,
  resourceType: string,
  context?: string
): Result<T, ActionError> {
  if (!resource) {
    return err(
      ActionErrors.notFound(
        resourceType,
        context ?? "verifyResourceOrganization"
      )
    );
  }

  try {
    assertOrganizationAccess(resource.organizationId, userOrgId, context);
    return ok(resource);
  } catch (error) {
    if (error instanceof Error && "actionError" in error) {
      return err((error as Error & { actionError: ActionError }).actionError);
    }
    return err(
      ActionErrors.internal(
        "Failed to verify organization access",
        error as Error,
        context ?? "verifyResourceOrganization"
      )
    );
  }
}

/**
 * Validate organization context from session for use in server actions
 * Returns both user and organization for convenience
 *
 * @param context - Context for logging
 * @returns Result containing user and organization or an error
 */
export async function validateOrganizationContext(context?: string): Promise<
  Result<
    {
      userId: string;
      organizationId: string;
      organization: BetterAuthOrganization;
    },
    ActionError
  >
> {
  const authResult = await getAuthSession();

  if (authResult.isErr()) {
    return err(
      ActionErrors.internal(
        "Failed to get authentication session",
        new Error(authResult.error),
        context ?? "validateOrganizationContext"
      )
    );
  }

  const { isAuthenticated, user, organization } = authResult.value;

  if (!isAuthenticated || !user) {
    return err(
      ActionErrors.unauthenticated(
        "User is not authenticated",
        context ?? "validateOrganizationContext"
      )
    );
  }

  if (!organization) {
    return err(
      ActionErrors.forbidden(
        "User does not belong to an organization",
        undefined,
        context ?? "validateOrganizationContext"
      )
    );
  }

  return ok({
    userId: user.id,
    organizationId: organization.id,
    organization,
  });
}

/**
 * Batch validate organization access for multiple resources
 * Useful when checking multiple items at once
 *
 * @param resources - Array of resources with organizationId
 * @param userOrgId - Organization ID of the authenticated user
 * @param resourceType - Type of resource for error messages
 * @param context - Context for logging
 * @returns Result containing valid resources or an error
 */
export function batchVerifyOrganization<
  T extends { organizationId: string | null }
>(
  resources: T[],
  userOrgId: string,
  resourceType: string,
  context?: string
): Result<T[], ActionError> {
  const invalidResources = resources.filter(
    (resource) => resource.organizationId !== userOrgId
  );

  if (invalidResources.length > 0) {
    logger.security.organizationViolation({
      resourceOrgId: invalidResources[0].organizationId ?? "null",
      userOrgId,
      context: context ?? "batchVerifyOrganization",
      reason: `Batch validation failed: ${invalidResources.length} resources with mismatched organization`,
    });

    return err(
      ActionErrors.forbidden(
        `Some ${resourceType} resources do not belong to your organization`,
        {
          count: invalidResources.length,
        },
        context ?? "batchVerifyOrganization"
      )
    );
  }

  return ok(resources);
}

