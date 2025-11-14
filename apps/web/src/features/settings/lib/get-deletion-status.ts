"use server";

import type { UserDeletionRequest } from "@/server/db/schema";
import { GdprDeletionService } from "@/server/services";

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

