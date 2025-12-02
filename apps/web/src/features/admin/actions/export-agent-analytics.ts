"use server";

import { logger } from "@/lib/logger";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { AgentAnalyticsService } from "@/server/services/agent-analytics.service";
import { err, ok } from "neverthrow";
import { z } from "zod";

const exportAnalyticsSchema = z.object({
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  organizationId: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * Server action to export agent analytics as CSV
 * Only accessible to admins
 */
export const exportAgentAnalytics = authorizedActionClient
  .metadata({ permissions: policyToPermissions("admin:all") })
  .schema(exportAnalyticsSchema)
  .action(async ({ ctx, parsedInput }) => {
    try {
      const { startDate, endDate, organizationId, userId } = parsedInput;

      const result = await AgentAnalyticsService.exportAnalyticsAsCSV({
        startDate,
        endDate,
        organizationId,
        userId,
      });

      if (result.isErr()) {
        logger.error("Failed to export analytics", {
          error: result.error.message,
        });
        return resultToActionResponse(
          err(
            ActionErrors.internal(
              "Failed to export analytics",
              result.error,
              "exportAgentAnalytics"
            )
          )
        );
      }

      return resultToActionResponse(
        ok({
          csv: result.value,
          filename: `agent-analytics-${startDate.toISOString().split("T")[0]}-${endDate.toISOString().split("T")[0]}.csv`,
        })
      );
    } catch (error) {
      logger.error("Error exporting agent analytics", {}, error as Error);
      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to export analytics",
            error as Error,
            "exportAgentAnalytics"
          )
        )
      );
    }
  });

