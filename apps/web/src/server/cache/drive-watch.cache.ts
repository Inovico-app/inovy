import { CacheTags } from "@/lib/cache-utils";
import { cacheTag } from "next/cache";
import { DriveWatchesService } from "../services/drive-watches.service";
import type { DriveWatchListItemDto } from "../dto/drive-watch.dto";

/**
 * Cached Drive Watch queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get cached Drive watches for a user
 * Returns watches with expiration status and project information
 * Note: Auth should be checked before calling this function
 */
export async function getCachedDriveWatches(
  userId: string
): Promise<DriveWatchListItemDto[]> {
  "use cache";

  cacheTag(CacheTags.driveWatches(userId));

  const result = await DriveWatchesService.listWatches(userId);

  if (result.isErr()) {
    return [];
  }

  return result.value;
}
