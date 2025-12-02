"use server";

import { logger } from "@/lib/logger";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { AgentMetricsService } from "@/server/services/agent-metrics.service";
import { err, ok } from "neverthrow";
import { z } from "zod";

const getMetricsSchema = z.object({
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
});

/**
 * Server action to get paginated agent metrics
 * Only accessible to admins
 */
export const getAgentMetrics = authorizedActionClient
  .metadata({ permissions: policyToPermissions("admin:all") })
  .schema(getMetricsSchema)
  .action(async ({ ctx, parsedInput }) => {
    try {
      const { startDate, endDate, organizationId, userId, limit, offset } =
        parsedInput;

      const result = await AgentMetricsService.getMetrics(
        {
          startDate,
          endDate,
          organizationId,
          userId,
        },
        limit,
        offset
      );

      if (result.isErr()) {
        logger.error("Failed to get metrics", {
          error: result.error.message,
        });
        return resultToActionResponse(
          err(
            ActionErrors.internal(
              "Failed to get metrics",
              result.error,
              "getAgentMetrics"
            )
          )
        );
      }

      return resultToActionResponse(ok(result.value));
    } catch (error) {
      logger.error("Error getting agent metrics", {}, error as Error);
      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to get metrics",
            error as Error,
            "getAgentMetrics"
          )
        )
      );
    }
  });

