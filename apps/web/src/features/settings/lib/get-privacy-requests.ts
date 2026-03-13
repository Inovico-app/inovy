import { getBetterAuthSession } from "@/lib/better-auth-session";
import { PrivacyRequestsQueries } from "@/server/data-access/privacy-requests.queries";
import type { PrivacyRequest } from "@/server/db/schema/privacy-requests";

/**
 * Server-side helper to fetch privacy requests for the profile page
 */
export async function getPrivacyRequests(): Promise<PrivacyRequest[]> {
  try {
    const authResult = await getBetterAuthSession();
    if (authResult.isErr() || !authResult.value.user) {
      return [];
    }

    return PrivacyRequestsQueries.findAllByUserId(authResult.value.user.id);
  } catch {
    return [];
  }
}
