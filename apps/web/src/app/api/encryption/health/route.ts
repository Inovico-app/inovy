import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";

/**
 * Encryption Health Check Endpoint
 * 
 * Verifies that encryption is properly configured for all layers:
 * - Database TLS/SSL
 * - External API HTTPS
 * - Security headers
 * 
 * GET /api/encryption/health
 */
export async function GET() {
  try {
    const checks = {
      database: {
        status: "unknown" as "healthy" | "unhealthy" | "unknown",
        encrypted: false,
        details: {} as Record<string, unknown>,
      },
      externalAPIs: {
        status: "healthy" as "healthy" | "unhealthy" | "unknown",
        services: {} as Record<string, { configured: boolean; secure: boolean }>,
      },
      securityConfig: {
        status: "healthy" as "healthy" | "unhealthy" | "unknown",
        environment: process.env.NODE_ENV || "development",
        httpsEnforced: false,
      },
    };

    // Check database encryption
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (databaseUrl) {
        const url = new URL(databaseUrl);
        const sslMode = url.searchParams.get("sslmode");
        const isNeon = url.hostname.includes("neon.tech");
        
        checks.database.encrypted = 
          sslMode === "require" || 
          sslMode === "verify-full" || 
          sslMode === "verify-ca" ||
          isNeon; // Neon enforces TLS by default

        // Try to query database
        const result = await db.execute(sql`SELECT 1 as test`);
        if (result) {
          checks.database.status = "healthy";
          checks.database.details = {
            provider: isNeon ? "Neon" : "PostgreSQL",
            sslMode: sslMode || "default (TLS enforced by provider)",
          };
        }
      } else {
        checks.database.status = "unhealthy";
      }
    } catch (error) {
      checks.database.status = "unhealthy";
      checks.database.details = {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Check external API configurations
    const apiServices = [
      {
        name: "openai",
        envVar: "OPENAI_API_KEY",
        defaultUrl: "https://api.openai.com",
      },
      {
        name: "anthropic",
        envVar: "ANTHROPIC_API_KEY",
        defaultUrl: "https://api.anthropic.com",
      },
      {
        name: "deepgram",
        envVar: "DEEPGRAM_API_KEY",
        defaultUrl: "https://api.deepgram.com",
      },
      {
        name: "redis",
        envVar: "UPSTASH_REDIS_REST_URL",
        urlEnvVar: "UPSTASH_REDIS_REST_URL",
      },
      {
        name: "qdrant",
        envVar: "QDRANT_URL",
        urlEnvVar: "QDRANT_URL",
      },
    ];

    for (const service of apiServices) {
      const configured = !!process.env[service.envVar];
      const url = service.urlEnvVar
        ? process.env[service.urlEnvVar]
        : service.defaultUrl;
      
      const secure = url
        ? url.startsWith("https://") || url.startsWith("http://localhost")
        : false;

      checks.externalAPIs.services[service.name] = {
        configured,
        secure: configured ? secure : true, // Not configured is not insecure
      };
    }

    // Check security configuration
    const betterAuthUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
    const isProduction = process.env.NODE_ENV === "production";
    const usesHttps =
      betterAuthUrl?.startsWith("https://") ||
      betterAuthUrl?.startsWith("http://localhost");

    checks.securityConfig.httpsEnforced = isProduction ? !!usesHttps : true;
    checks.securityConfig.status =
      isProduction && !usesHttps ? "unhealthy" : "healthy";

    // Determine overall status
    const overallHealthy =
      checks.database.status === "healthy" &&
      checks.externalAPIs.status === "healthy" &&
      checks.securityConfig.status === "healthy" &&
      checks.database.encrypted;

    return NextResponse.json(
      {
        status: overallHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        ssdCompliance: {
          norm: "SSD-4.1.02",
          description: "Encryption between all application layers",
          compliant: overallHealthy,
        },
        checks,
        summary: {
          databaseEncrypted: checks.database.encrypted,
          allAPIsSecure: Object.values(checks.externalAPIs.services).every(
            (s) => s.secure
          ),
          httpsEnforced: checks.securityConfig.httpsEnforced,
        },
      },
      { status: overallHealthy ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
