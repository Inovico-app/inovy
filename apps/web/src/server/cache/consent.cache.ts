import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import type { ConsentParticipant } from "../db/schema/consent";
import { ConsentService } from "../services/consent.service";

/**
 * Cached consent queries
 * Uses Next.js cache tags for invalidation.
 */
export async function getCachedConsentParticipants(
  recordingId: string,
  organizationId: string
): Promise<ConsentParticipant[]> {
  "use cache";
  cacheTag(CacheTags.consentParticipants(recordingId, organizationId));
  const result = await ConsentService.getConsentParticipants(
    recordingId,
    organizationId
  );
  return result.isOk() ? result.value : [];
}

