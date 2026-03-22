"use server";

import { resolveAuthContext } from "@/lib/auth-context";
import type { UserDeletionRequest } from "@/server/db/schema/user-deletion-requests";
import { GdprDeletionService } from "@/server/services/gdpr-deletion.service";

/**
 * Server function to get user deletion request status
 * Called from React Server Components
 */
export async function getDeletionStatus(): Promise<UserDeletionRequest | null> {
  const authResult = await resolveAuthContext("getDeletionStatus");

  if (authResult.isErr()) {
    return null;
  }

  const result = await GdprDeletionService.getDeletionRequestStatus(
    authResult.value,
  );

  if (result.isErr()) {
    return null;
  }

  return result.value;
}
