"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { EmbeddingCacheQueries } from "@/server/data-access/embedding-cache.queries";
import { ok } from "neverthrow";
import { z } from "zod";

const invalidateCacheByModelSchema = z.object({
  model: z.string().min(1, "Model name is required"),
});

/**
 * Invalidate all embedding cache entries
 * Admin-only action
 */
export const invalidateEmbeddingCache = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("admin:all"),
  })
  .action(async () => {
    try {
      const deletedCount = await EmbeddingCacheQueries.invalidateCache();

      return resultToActionResponse(
        ok({
          success: true,
          deletedCount,
          message: `Successfully invalidated ${deletedCount} cache entries`,
        })
      );
    } catch (error) {
      throw ActionErrors.internal(
        "Failed to invalidate embedding cache",
        error as Error,
        "invalidateEmbeddingCache"
      );
    }
  });

/**
 * Invalidate embedding cache entries for a specific model
 * Admin-only action
 */
export const invalidateEmbeddingCacheByModel = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("admin:all"),
  })
  .inputSchema(invalidateCacheByModelSchema)
  .action(async ({ parsedInput }) => {
    const { model } = parsedInput;

    try {
      const deletedCount =
        await EmbeddingCacheQueries.invalidateCacheByModel(model);

      return resultToActionResponse(
        ok({
          success: true,
          deletedCount,
          model,
          message: `Successfully invalidated ${deletedCount} cache entries for model ${model}`,
        })
      );
    } catch (error) {
      throw ActionErrors.internal(
        `Failed to invalidate embedding cache for model ${model}`,
        error as Error,
        "invalidateEmbeddingCacheByModel"
      );
    }
  });

/**
 * Get embedding cache statistics
 * Admin-only action
 */
export const getEmbeddingCacheStats = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("admin:all"),
  })
  .action(async () => {
    try {
      const stats = await EmbeddingCacheQueries.getCacheStats();

      return resultToActionResponse(ok(stats));
    } catch (error) {
      throw ActionErrors.internal(
        "Failed to get embedding cache statistics",
        error as Error,
        "getEmbeddingCacheStats"
      );
    }
  });

