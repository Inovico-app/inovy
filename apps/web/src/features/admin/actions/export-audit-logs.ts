"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { policyToPermissions } from "@/lib/permission-helpers";
import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { AuditLogService } from "@/server/services/audit-log.service";
import { z } from "zod";

const exportAuditLogsSchema = z.object({
  format: z.enum(["csv", "json"]).default("csv"),
  userId: z.string().optional(),
  eventType: z.array(z.string()).optional(),
  resourceType: z.array(z.string()).optional(),
  action: z.array(z.string()).optional(),
  resourceId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Server action to export audit logs
 * Only accessible to admins
 * Returns audit logs in CSV or JSON format
 */
export const exportAuditLogs = authorizedActionClient
  .metadata({ permissions: policyToPermissions("admin:all") })
  .inputSchema(exportAuditLogsSchema)
  .action(async ({ parsedInput }) => {
    try {
      const authResult = await getAuthSession();

      if (
        authResult.isErr() ||
        !authResult.value.isAuthenticated ||
        !authResult.value.organization
      ) {
        throw new Error("Authentication or organization required");
      }

      const { organization } = authResult.value;

      const filters = {
        ...parsedInput,
        startDate: parsedInput.startDate
          ? new Date(parsedInput.startDate)
          : undefined,
        endDate: parsedInput.endDate
          ? new Date(parsedInput.endDate)
          : undefined,
        limit: 10000, // Large limit for export
      };

      const result = await AuditLogService.getAuditLogs(
        organization.id,
        filters
      );

      if (result.isErr()) {
        throw new Error(result.error.message);
      }

      const { logs } = result.value;

      // Log the export event
      if (authResult.value.user) {
        await AuditLogService.createAuditLog({
          eventType: "audit_log_exported",
          resourceType: "export",
          userId: authResult.value.user.id,
          organizationId: organization.id,
          action: "export",
          metadata: {
            format: parsedInput.format,
            count: logs.length,
            filters: parsedInput,
          },
        });
      }

      if (parsedInput.format === "csv") {
        // Convert to CSV
        const headers = [
          "ID",
          "Event Type",
          "Resource Type",
          "Resource ID",
          "User ID",
          "Action",
          "IP Address",
          "User Agent",
          "Created At",
          "Hash",
        ];

        const rows = logs.map((log) => [
          log.id,
          log.eventType,
          log.resourceType,
          log.resourceId ?? "",
          log.userId,
          log.action,
          log.ipAddress ?? "",
          log.userAgent ?? "",
          log.createdAt.toISOString(),
          log.hash ?? "",
        ]);

        const csvContent = [
          headers.join(","),
          ...rows.map((row) =>
            row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
          ),
        ].join("\n");

        return {
          format: "csv" as const,
          content: csvContent,
          filename: `audit-logs-${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        // Return JSON
        return {
          format: "json" as const,
          content: JSON.stringify(logs, null, 2),
          filename: `audit-logs-${new Date().toISOString().split("T")[0]}.json`,
        };
      }
    } catch (error) {
      logger.error("Failed to export audit logs", {}, error as Error);
      throw new Error("Failed to export audit logs");
    }
  });

