"use cache";

import { CacheTags } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import type { BotSession, BotStatus } from "@/server/db/schema/bot-sessions";
import { cacheTag } from "next/cache";

/**
 * Cached bot sessions queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get cached bot sessions with pagination
 * Returns paginated sessions filtered by status (or all if not specified)
 */
export async function getCachedBotSessions(
  organizationId: string,
  options?: {
    status?: BotStatus | BotStatus[];
    limit?: number;
    offset?: number;
  }
): Promise<{
  sessions: BotSession[];
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
}> {
  "use cache";
  cacheTag(CacheTags.botSessions(organizationId));

  logger.info("Fetching bot sessions", {
    organizationId,
    status: options?.status,
    limit: options?.limit,
    offset: options?.offset,
  });

  const result = await BotSessionsQueries.findByStatusWithPagination(
    organizationId,
    options
  );

  return result;
}

/**
 * Get cached bot session details with recording data
 * Returns session with joined recording metadata if recordingId exists
 */
export async function getCachedBotSessionDetails(
  sessionId: string,
  organizationId: string
): Promise<
  | (BotSession & {
      recording?: {
        id: string;
        title: string;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        fileMimeType: string;
        duration: number | null;
        recordingDate: Date;
      } | null;
    })
  | null
> {
  "use cache";
  cacheTag(
    CacheTags.botSession(sessionId),
    CacheTags.botSessions(organizationId)
  );

  logger.info("Fetching bot session details", {
    sessionId,
    organizationId,
  });

  const result = await BotSessionsQueries.findByIdWithRecording(
    sessionId,
    organizationId
  );

  return result;
}

