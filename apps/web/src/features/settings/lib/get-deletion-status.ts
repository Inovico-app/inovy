"use server";

import type { UserDeletionRequest } from "@/server/db/schema/user-deletion-requests";
import { GdprDeletionService } from "@/server/services/gdpr-deletion.service";

/**
 * Server function to get user deletion request status
 * Called from React Server Components
 * Auth is handled internally by the service
 */
export async function getDeletionStatus(): Promise<UserDeletionRequest | null> {
  const result = await GdprDeletionService.getDeletionRequestStatus();

  if (result.isErr()) {
    return null;
  }

  return result.value;
}

