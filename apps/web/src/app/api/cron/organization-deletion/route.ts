import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import { organizations } from "@/server/db/schema/auth";
import { OrganizationDeletionService } from "@/server/services/organization-deletion.service";
import { lte } from "drizzle-orm";
import { after, connection } from "next/server";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/cron/organization-deletion
 * Processes organizations that have passed their 7-day deletion grace period.
 * Finds all orgs where scheduledDeletionAt <= now and hard-deletes all data.
 * Authenticated via Authorization: Bearer ${CRON_SECRET} header.
 *
 * Schedule: Runs daily at 1:00 UTC.
 */
export async function GET(request: NextRequest) {
  await connection();
  const startTime = Date.now();

  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET not configured", {
        component: "GET /api/cron/organization-deletion",
      });
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const orgsToDelete = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        scheduledDeletionAt: organizations.scheduledDeletionAt,
      })
      .from(organizations)
      .where(lte(organizations.scheduledDeletionAt, now));

    if (orgsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No organizations to delete",
        processed: 0,
      });
    }

    logger.info("Starting organization deletion cron", {
      component: "GET /api/cron/organization-deletion",
      count: orgsToDelete.length,
      organizationIds: orgsToDelete.map((o) => o.id),
    });

    const results: Array<{
      organizationId: string;
      name: string | null;
      success: boolean;
      error?: string;
    }> = [];

    for (const org of orgsToDelete) {
      try {
        await OrganizationDeletionService.deleteOrganizationData(org.id);
        results.push({
          organizationId: org.id,
          name: org.name,
          success: true,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error("Failed to delete organization", {
          component: "GET /api/cron/organization-deletion",
          organizationId: org.id,
          error: errorMsg,
        });
        results.push({
          organizationId: org.id,
          name: org.name,
          success: false,
          error: errorMsg,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    const durationMs = Date.now() - startTime;

    after(() => {
      logger.info("Organization deletion cron completed", {
        component: "GET /api/cron/organization-deletion",
        processed: results.length,
        succeeded: successCount,
        failed: failureCount,
        durationMs,
      });
    });

    return NextResponse.json({
      success: failureCount === 0,
      processed: results.length,
      succeeded: successCount,
      failed: failureCount,
      durationMs,
      details: results,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    Sentry.captureException(error, {
      tags: {
        component: "cron",
        cron_job: "organization-deletion",
      },
    });
    logger.error("Organization deletion cron failed", {
      component: "GET /api/cron/organization-deletion",
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    });
    return NextResponse.json(
      {
        error: "Organization deletion cron failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
