/**
 * Server-side permission check helpers
 * Uses Better Auth's server-side API
 */

import "server-only";

import { headers } from "next/headers";
import { betterAuthInstance } from "./better-auth-server";
import type { Permissions } from "./permissions";

/**
 * Server-side permission check helper
 * Uses Better Auth's hasPermission API
 *
 * @example
 * ```ts
 * import { checkPermission } from "@/lib/permissions-server";
 * import { Permissions } from "@/lib/permissions";
 *
 * const canCreateProject = await checkPermission(Permissions.project.create);
 * ```
 */
export async function checkPermission(
  permissions: Permissions
): Promise<boolean> {
  try {
    const result = await betterAuthInstance.api.hasPermission({
      headers: await headers(),
      body: {
        permissions,
      },
    });

    return result?.success === true;
  } catch {
    return false;
  }
}

