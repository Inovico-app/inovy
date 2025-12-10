import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import { KnowledgeBaseBrowserService } from "@/server/services/knowledge-base-browser.service";
import { AgentConfigService } from "@/server/services/agent-config.service";
import type { NextRequest } from "next/server";

/**
 * GET /api/agent/knowledge-base/preview
 * Get document preview with sample chunks
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getBetterAuthSession();

    if (
      authResult.isErr() ||
      !authResult.value.isAuthenticated ||
      !authResult.value.organization
    ) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = authResult.value.organization.id;

    // Check if agent is enabled for this organization
    const agentStatusResult = await AgentConfigService.isAgentEnabled(
      organizationId
    );

    if (agentStatusResult.isErr() || !agentStatusResult.value) {
      return Response.json(
        {
          error: "Agent is disabled for this organization",
          code: "AGENT_DISABLED",
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get("documentId");
    const sampleSizeParam = searchParams.get("sampleSize");
    
    // Validate and parse sampleSize with safe defaults
    const DEFAULT_SAMPLE_SIZE = 5;
    const MIN_SAMPLE_SIZE = 1;
    const MAX_SAMPLE_SIZE = 100;
    
    let sampleSize = DEFAULT_SAMPLE_SIZE;
    if (sampleSizeParam) {
      const parsed = parseInt(sampleSizeParam, 10);
      if (
        Number.isFinite(parsed) &&
        Number.isInteger(parsed) &&
        parsed >= MIN_SAMPLE_SIZE &&
        parsed <= MAX_SAMPLE_SIZE
      ) {
        sampleSize = parsed;
      }
    }

    if (!documentId) {
      return Response.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    // Get document preview
    const result = await KnowledgeBaseBrowserService.getDocumentPreview(
      documentId,
      organizationId,
      sampleSize
    );

    if (result.isErr()) {
      logger.error("Failed to get document preview", {
        component: "api/agent/knowledge-base/preview",
        documentId,
        error: result.error.message,
      });
      return Response.json(
        { error: result.error.message },
        { status: result.error.code === "INTERNAL_SERVER_ERROR" ? 500 : 400 }
      );
    }

    return Response.json(result.value);
  } catch (error) {
    logger.error("Unexpected error getting document preview", {
      component: "api/agent/knowledge-base/preview",
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

