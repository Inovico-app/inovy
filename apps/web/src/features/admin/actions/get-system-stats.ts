"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { getAuthSession } from "@/lib/auth";
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
  .schema(z.object({}))
  .action(async (): Promise<SystemStats> => {
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
      const orgCode = organization.orgCode;

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
      throw new Error("Failed to fetch system statistics");
    }
  });

