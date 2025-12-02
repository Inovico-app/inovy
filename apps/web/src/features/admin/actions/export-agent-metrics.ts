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

const exportMetricsSchema = z.object({
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  organizationId: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * Server action to export agent metrics as CSV
 * Only accessible to admins
 */
export const exportAgentMetrics = authorizedActionClient
  .metadata({ permissions: policyToPermissions("admin:all") })
  .schema(exportMetricsSchema)
  .action(async ({ ctx, parsedInput }) => {
    try {
      const { startDate, endDate, organizationId, userId } = parsedInput;

      const result = await AgentMetricsService.exportMetricsAsCSV({
        startDate,
        endDate,
        organizationId,
        userId,
      });

      if (result.isErr()) {
        logger.error("Failed to export metrics", {
          error: result.error.message,
        });
        return resultToActionResponse(
          err(
            ActionErrors.internal(
              "Failed to export metrics",
              result.error,
              "exportAgentMetrics"
            )
          )
        );
      }

      return resultToActionResponse(
        ok({
          csv: result.value,
          filename: `agent-metrics-${startDate.toISOString().split("T")[0]}-${endDate.toISOString().split("T")[0]}.csv`,
        })
      );
    } catch (error) {
      logger.error("Error exporting agent metrics", {}, error as Error);
      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to export metrics",
            error as Error,
            "exportAgentMetrics"
          )
        )
      );
    }
  });

