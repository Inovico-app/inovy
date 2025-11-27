import { headers } from "next/headers";
import { betterAuthInstance } from "./better-auth";

/**
 * Temporary server-side session helper for Better Auth
 * This will be replaced in Phase 3 (INO-233) with a cached version using React cache()
 *
 * @returns Better Auth session or null if not authenticated
 */
export async function getBetterAuthSession() {
  try {
    const session = await betterAuthInstance.api.getSession({
      headers: await headers(),
    });

    return session;
  } catch (error) {
    return null;
  }
}

