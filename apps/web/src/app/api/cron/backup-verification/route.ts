import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import { sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";

interface VerificationCheck {
  name: string;
  status: "pass" | "fail" | "skip";
  latencyMs: number;
  details?: string;
}

interface BackupVerificationReport {
  checks: VerificationCheck[];
  overallStatus: "pass" | "fail";
  timestamp: string;
}

/**
 * GET /api/cron/backup-verification
 * Verifies backup infrastructure accessibility for ISO 27001 A.8.13 compliance
 * Authenticated via Authorization: Bearer ${CRON_SECRET} header
 *
 * Checks:
 * - Neon PostgreSQL database connectivity (SELECT 1)
 * - Azure Blob Storage container accessibility (if configured)
 */
export async function GET(request: NextRequest) {
  await connection();

  try {
    // Authenticate via CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET not configured", {
        component: "GET /api/cron/backup-verification",
      });
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron job attempt", {
        component: "GET /api/cron/backup-verification",
        hasAuthHeader: !!authHeader,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting backup verification cron job", {
      component: "GET /api/cron/backup-verification",
    });

    const checks: VerificationCheck[] = [];

    // Check 1: Neon PostgreSQL database connectivity
    const dbCheck = await verifyDatabaseConnectivity();
    checks.push(dbCheck);

    // Check 2: Azure Blob Storage accessibility
    const storageCheck = await verifyBlobStorageAccessibility();
    checks.push(storageCheck);

    const overallStatus = checks.every(
      (c) => c.status === "pass" || c.status === "skip",
    )
      ? "pass"
      : "fail";

    const report: BackupVerificationReport = {
      checks,
      overallStatus,
      timestamp: new Date().toISOString(),
    };

    logger.info("Backup verification cron job completed", {
      component: "GET /api/cron/backup-verification",
      report,
    });

    const httpStatus = overallStatus === "pass" ? 200 : 503;

    return NextResponse.json(
      {
        success: overallStatus === "pass",
        report,
      },
      { status: httpStatus },
    );
  } catch (error) {
    logger.error("Error in backup verification cron job", {
      component: "GET /api/cron/backup-verification",
      error: error instanceof Error ? error : new Error(String(error)),
    });

    Sentry.withScope((scope) => {
      scope.setTags({ component: "cron-backup-verification" });
      scope.setContext("cron", { cron_job: "backup-verification" });
      Sentry.captureException(error);
    });

    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 },
    );
  }
}

/**
 * Verify Neon PostgreSQL database connectivity
 * Runs SELECT 1 to confirm the database is reachable and responding.
 */
async function verifyDatabaseConnectivity(): Promise<VerificationCheck> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    const latencyMs = Date.now() - start;

    logger.debug("Database connectivity check passed", {
      component: "backup-verification.verifyDatabaseConnectivity",
      latencyMs,
    });

    return {
      name: "neon-postgresql",
      status: "pass",
      latencyMs,
      details: "SELECT 1 succeeded",
    };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("Database connectivity check failed", {
      component: "backup-verification.verifyDatabaseConnectivity",
      latencyMs,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return {
      name: "neon-postgresql",
      status: "fail",
      latencyMs,
      details: `Database unreachable: ${errorMessage}`,
    };
  }
}

/**
 * Verify Azure Blob Storage accessibility
 * Attempts to list containers or check container existence.
 * Skips if Azure Storage is not configured.
 */
async function verifyBlobStorageAccessibility(): Promise<VerificationCheck> {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!connectionString) {
    return {
      name: "azure-blob-storage",
      status: "skip",
      latencyMs: 0,
      details: "AZURE_STORAGE_CONNECTION_STRING not configured; skipping check",
    };
  }

  const start = Date.now();
  try {
    // Dynamic import to avoid loading Azure SDK when not configured
    const { BlobServiceClient } = await import("@azure/storage-blob");
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);

    const containerName =
      process.env.AZURE_STORAGE_CONTAINER_NAME ??
      process.env.AZURE_STORAGE_PRIVATE_CONTAINER ??
      "private";

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const exists = await containerClient.exists();
    const latencyMs = Date.now() - start;

    if (!exists) {
      logger.warn("Azure Blob Storage container does not exist", {
        component: "backup-verification.verifyBlobStorageAccessibility",
        containerName,
        latencyMs,
      });

      return {
        name: "azure-blob-storage",
        status: "fail",
        latencyMs,
        details: `Container "${containerName}" does not exist`,
      };
    }

    logger.debug("Azure Blob Storage connectivity check passed", {
      component: "backup-verification.verifyBlobStorageAccessibility",
      containerName,
      latencyMs,
    });

    return {
      name: "azure-blob-storage",
      status: "pass",
      latencyMs,
      details: `Container "${containerName}" accessible`,
    };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("Azure Blob Storage connectivity check failed", {
      component: "backup-verification.verifyBlobStorageAccessibility",
      latencyMs,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return {
      name: "azure-blob-storage",
      status: "fail",
      latencyMs,
      details: `Storage unreachable: ${errorMessage}`,
    };
  }
}
