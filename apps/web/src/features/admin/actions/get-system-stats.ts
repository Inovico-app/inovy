"use server";

import { ActionErrors } from "@/lib";
import { authorizedActionClient } from "@/lib/action-client";
import { logger } from "@/lib/logger";
import { ProjectQueries } from "@/server/data-access";
import { getOrganizationMembers } from "@/server/data-access/organization.queries";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { TasksQueries } from "@/server/data-access/tasks.queries";
import { z } from "zod";

export interface SystemStats {
  totalUsers: number;
  activeProjects: number;
  totalRecordings: number;
  totalTasks: number;
  organizationCode: string;
}

/**
 * Server action to get system statistics
 * Only accessible to admins
 */
export const getSystemStats = authorizedActionClient
  .metadata({ policy: "admin:all" })
  .inputSchema(z.object({}))
  .action(async ({ ctx }): Promise<SystemStats> => {
    try {
      const orgCode = ctx.user?.organization_code;

      if (!orgCode) {
        throw ActionErrors.internal(
          "Failed to get organization code from context, it is required",
          undefined,
          "get-system-stats"
        );
      }

      // Fetch statistics in parallel
      const [projectCount, recordingCount, taskCount, members] =
        await Promise.all([
          ProjectQueries.countByOrganization(orgCode, "active").catch(() => 0),
          RecordingsQueries.countByOrganization(orgCode).catch(() => 0),
          TasksQueries.countByOrganization(orgCode).catch(() => 0),
          getOrganizationMembers(orgCode).catch(() => []),
        ]);

      return {
        totalUsers: members.length,
        activeProjects: projectCount,
        totalRecordings: recordingCount,
        totalTasks: taskCount,
        organizationCode: orgCode,
      };
    } catch (error) {
      logger.error("Failed to get system stats", {}, error as Error);
      throw ActionErrors.internal(
        "Failed to get system stats",
        error as Error,
        "get-system-stats"
      );
    }
  });

