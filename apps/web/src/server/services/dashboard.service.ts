import { getBetterAuthSession } from "@/lib/better-auth-session";
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
  static async getDashboardOverview(): Promise<
    ActionResult<DashboardOverview>
  > {
    try {
      const session = await getBetterAuthSession();
      if (session.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            session.error,
            "DashboardService.getDashboardOverview"
          )
        );
      }

      const { user, organization } = session.value;

      if (!user) {
        return err(
          ActionErrors.notFound(
            "User not found",
            "DashboardService.getDashboardOverview"
          )
        );
      }

      if (!organization) {
        return err(
          ActionErrors.notFound(
            "Organization not found",
            "DashboardService.getDashboardOverview"
          )
        );
      }

      logger.debug("Fetching dashboard overview", {
        userId: user.id,
        organizationId: organization.id,
      });

      // Fetch all data in parallel using DAL
      const [stats, recentProjects, recentRecordings] = await Promise.all([
        getDashboardStats(organization.id),
        getRecentProjectsForDashboard(organization.id, 5),
        getRecentRecordingsForDashboard(organization.id, 5),
      ]);

      const overview: DashboardOverview = {
        stats,
        recentProjects,
        recentRecordings,
      };

      logger.info("Successfully fetched dashboard overview", {
        userId: user.id,
        organizationId: organization.id,
        projectCount: overview.stats.totalProjects,
        recordingCount: overview.stats.totalRecordings,
      });

      return ok(overview);
    } catch (error) {
      logger.error("Error fetching dashboard overview", {
        component: "DashboardService.getDashboardOverview",
        error: error as Error,
      });

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

