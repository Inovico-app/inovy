/**
 * Client-side permission check helpers
 * Uses Better Auth's client-side API
 */

"use client";

import { authClient } from "../auth-client";
import { logger } from "../logger";
import type { Permissions } from "./permissions";

/**
 * Client-side permission check helper
 * Uses Better Auth client's hasPermission API
 *
 * @example
 * ```ts
 * import { checkPermissionClient } from "@/lib/permissions-client";
 * import { Permissions } from "@/lib/permissions";
 *
 * const canCreateProject = await checkPermissionClient(Permissions.project.create);
 * ```
 */
export async function checkPermissionClient(
  permissions: Permissions
): Promise<boolean> {
  try {
    const result = await authClient.organization.hasPermission({
      permissions,
    });

    // Better Auth client returns a result object with success property
    if (result && typeof result === "object" && "success" in result) {
      return result.success === true;
    }
    // Fallback for boolean return
    return Boolean(result);
  } catch {
    return false;
  }
}

/**
 * Client-side role permission check helper
 * Checks if a specific role has the required permissions
 * Useful for UI rendering without making API calls
 *
 * @example
 * ```ts
 * import { checkRolePermission } from "@/lib/permissions-client";
 * import { Permissions } from "@/lib/permissions";
 *
 * const canCreateProject = await checkRolePermission({
 *   permissions: Permissions.project.create,
 *   role: "admin"
 * });
 * ```
 */
export async function checkRolePermission({
  permissions,
  role,
}: {
  permissions: Permissions;
  role: "superadmin" | "admin" | "manager" | "user" | "viewer";
}): Promise<boolean> {
  try {
    return authClient.organization.checkRolePermission({
      permissions,
      role,
    });
  } catch (error: unknown) {
    logger.auth.error("CHECK ROLE PERMISSION ERROR:", error as Error);
    return false;
  }
}

