import { type Result, err, ok } from "neverthrow";
import { ActionErrors, type ActionError } from "../../lib/action-errors";
import { logger } from "../../lib/logger";
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
  static async getDashboardOverview(
    organizationId: string
  ): Promise<Result<DashboardOverview, ActionError>> {
    try {
      logger.info("Fetching dashboard overview", { organizationId });

      // Fetch all data in parallel
      const [statsResult, recentProjectsResult, recentRecordingsResult] =
        await Promise.all([
          this.getSafeDashboardStats(organizationId),
          this.getSafeRecentProjects(organizationId),
          this.getSafeRecentRecordings(organizationId),
        ]);

      // Check for any errors
      if (statsResult.isErr()) {
        return err(statsResult.error);
      }

      if (recentProjectsResult.isErr()) {
        return err(recentProjectsResult.error);
      }

      if (recentRecordingsResult.isErr()) {
        return err(recentRecordingsResult.error);
      }

      const overview: DashboardOverview = {
        stats: statsResult.value,
        recentProjects: recentProjectsResult.value,
        recentRecordings: recentRecordingsResult.value,
      };

      logger.info("Successfully fetched dashboard overview", {
        organizationId,
        projectCount: overview.stats.totalProjects,
        recordingCount: overview.stats.totalRecordings,
      });

      return ok(overview);
    } catch (error) {
      logger.error(
        "Error fetching dashboard overview",
        { organizationId },
        error as Error
      );

      return err(
        ActionErrors.internal(
          "Failed to load dashboard data",
          error as Error,
          "getDashboardOverview"
        )
      );
    }
  }

  /**
   * Safe wrapper for getting dashboard stats
   */
  private static async getSafeDashboardStats(
    organizationId: string
  ): Promise<
    Result<{ totalProjects: number; totalRecordings: number }, ActionError>
  > {
    try {
      const stats = await getDashboardStats(organizationId);
      return ok(stats);
    } catch (error) {
      logger.error(
        "Error fetching dashboard stats",
        { organizationId },
        error as Error
      );

      return err(
        ActionErrors.internal(
          "Failed to fetch statistics",
          error as Error,
          "getSafeDashboardStats"
        )
      );
    }
  }

  /**
   * Safe wrapper for getting recent projects
   */
  private static async getSafeRecentProjects(
    organizationId: string
  ): Promise<
    Result<
      Array<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        recordingCount: number;
      }>,
      ActionError
    >
  > {
    try {
      const projects = await getRecentProjectsForDashboard(organizationId, 5);
      return ok(projects);
    } catch (error) {
      logger.error(
        "Error fetching recent projects",
        { organizationId },
        error as Error
      );

      return err(
        ActionErrors.internal(
          "Failed to fetch recent projects",
          error as Error,
          "getSafeRecentProjects"
        )
      );
    }
  }

  /**
   * Safe wrapper for getting recent recordings
   */
  private static async getSafeRecentRecordings(
    organizationId: string
  ): Promise<
    Result<
      Array<{
        id: string;
        title: string;
        description: string | null;
        projectId: string;
        createdAt: Date;
        transcriptionStatus: string;
      }>,
      ActionError
    >
  > {
    try {
      const recordings = await getRecentRecordingsForDashboard(
        organizationId,
        5
      );
      return ok(recordings);
    } catch (error) {
      logger.error(
        "Error fetching recent recordings",
        { organizationId },
        error as Error
      );

      return err(
        ActionErrors.internal(
          "Failed to fetch recent recordings",
          error as Error,
          "getSafeRecentRecordings"
        )
      );
    }
  }
}
