import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { logger } from "../../lib/logger";
import { projects } from "../db/schema/projects";
import { recordings } from "../db/schema/recordings";

/**
 * Dashboard Data Access Queries
 * Efficient queries for dashboard data aggregation
 */

/**
 * Get recent active projects for dashboard
 */
export async function getRecentProjectsForDashboard(
  organizationId: string,
  limit: number = 5
) {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      createdAt: projects.createdAt,
      recordingCount: count(recordings.id),
    })
    .from(projects)
    .leftJoin(recordings, eq(projects.id, recordings.projectId))
    .where(eq(projects.organizationId, organizationId))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt))
    .limit(limit);
}

/**
 * Get recent recordings for dashboard
 */
export async function getRecentRecordingsForDashboard(
  organizationId: string,
  limit: number = 5
) {
  return db
    .select({
      id: recordings.id,
      title: recordings.title,
      description: recordings.description,
      projectId: recordings.projectId,
      projectName: projects.name,
      createdAt: recordings.createdAt,
      transcriptionStatus: recordings.transcriptionStatus,
    })
    .from(recordings)
    .innerJoin(projects, eq(recordings.projectId, projects.id))
    .where(eq(projects.organizationId, organizationId))
    .orderBy(desc(recordings.createdAt))
    .limit(limit);
}

/**
 * Get dashboard statistics (counts)
 */
export async function getDashboardStats(organizationId: string) {
  const totalProjects = await db
    .select({ count: count() })
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, organizationId),
        eq(projects.status, "active")
      )
    );

  const totalRecordings = await db
    .select({ count: count() })
    .from(recordings)
    .innerJoin(projects, eq(recordings.projectId, projects.id))
    .where(
      and(
        eq(projects.organizationId, organizationId),
        eq(projects.status, "active"),
        eq(recordings.organizationId, organizationId),
        eq(recordings.status, "active")
      )
    );

  // Convert count to number (drizzle may return string or BigInt)
  const projectCount = Number(totalProjects[0]?.count ?? 0);
  const recordingCount = Number(totalRecordings[0]?.count ?? 0);

  // Debug: Also check total counts without status filter to help diagnose
  const [totalProjectsAll, totalRecordingsAll] = await Promise.all([
    db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.organizationId, organizationId)),
    db
      .select({ count: count() })
      .from(recordings)
      .where(eq(recordings.organizationId, organizationId)),
  ]);

  logger.debug("Dashboard stats query results", {
    component: "getDashboardStats",
    organizationId,
    rawProjectCount: totalProjects[0]?.count,
    rawRecordingCount: totalRecordings[0]?.count,
    projectCount,
    recordingCount,
    totalProjectsAll: Number(totalProjectsAll[0]?.count ?? 0),
    totalRecordingsAll: Number(totalRecordingsAll[0]?.count ?? 0),
  });

  return {
    totalProjects: projectCount,
    totalRecordings: recordingCount,
  };
}

