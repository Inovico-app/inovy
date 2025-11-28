/**
 * Server-side permission check helpers
 * Uses Better Auth's server-side API
 */

import { headers } from "next/headers";
import { auth } from "../auth";
import { logger } from "../logger";
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
  const result = await auth.api.hasPermission({
    headers: await headers(),
    body: {
      permissions,
    },
  });

  if (result.error) {
    logger.auth.error("Error checking user permissions", result.error, {
      permissions,
    });
    return false;
  }

  return result?.success ?? false;
}

