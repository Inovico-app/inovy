import { err, ok } from "neverthrow";
import { logger } from "../../lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import {
  getDashboardStats,
  getRecentProjectsForDashboard,
  getRecentRecordingsForDashboard,
} from "../data-access/dashboard.queries";
import { UserService } from "./user.service";

interface DashboardOverview {
  stats: {
    totalProjects: number;
    totalRecordings: number;
  };
  recentProjects: Array<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    recordingCount: number;
  }>;
  recentRecordings: Array<{
    id: string;
    title: string;
    description: string | null;
    projectId: string;
    createdAt: Date;
    transcriptionStatus: string;
  }>;
}

/**
 * Dashboard Service
 * Aggregates dashboard data for user overview
 */
export class DashboardService {
  /**
   * Get complete dashboard overview for a user's organization
   */
  static async getDashboardOverview(
    userId: string
  ): Promise<ActionResult<DashboardOverview>> {
    try {
      // Get organizationId from userId using UserService
      const organizationIdResult =
        await UserService.getOrganizationIdByUserId(userId);

      if (organizationIdResult.isErr()) {
        return err(organizationIdResult.error);
      }

      const organizationId = organizationIdResult.value;

      logger.info("Fetching dashboard overview", { userId, organizationId });

      // Fetch all data in parallel using DAL
      const [stats, recentProjects, recentRecordings] = await Promise.all([
        getDashboardStats(organizationId),
        getRecentProjectsForDashboard(organizationId, 5),
        getRecentRecordingsForDashboard(organizationId, 5),
      ]);

      const overview: DashboardOverview = {
        stats,
        recentProjects,
        recentRecordings,
      };

      logger.info("Successfully fetched dashboard overview", {
        userId,
        organizationId,
        projectCount: overview.stats.totalProjects,
        recordingCount: overview.stats.totalRecordings,
      });

      return ok(overview);
    } catch (error) {
      logger.error(
        "Error fetching dashboard overview",
        { userId },
        error as Error
      );

      return err(
        ActionErrors.internal(
          "Failed to load dashboard data",
          error as Error,
          "DashboardService.getDashboardOverview"
        )
      );
    }
  }
}

